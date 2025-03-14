// PesaFlow Server Storage System
// Handles saving and retrieving user data for the PesaFlow Management System

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise'); // Using promise version for async/await
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pesaflow_db'
};

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'pesaflow_secret_key';
const JWT_EXPIRES_IN = '24h';

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Initialize database connection
testDatabaseConnection();

const PesaFlowServerStorage = (function() {
    // Private variables and methods
    const VERSION = '1.0.0';
    const DATA_DIR = path.join(__dirname, 'data');
    const DATABASE_FILE = path.join(DATA_DIR, 'pesaflow_data.json');
    
    // Data structure initialization
    const initialData = {
        version: VERSION,
        users: [],
        expenses: [],
        categories: [
            { id: 1, name: 'Travel', icon: 'plane' },
            { id: 2, name: 'Meals', icon: 'utensils' },
            { id: 3, name: 'Office Supplies', icon: 'paperclip' },
            { id: 4, name: 'Software', icon: 'laptop-code' },
            { id: 5, name: 'Accommodation', icon: 'hotel' },
            { id: 6, name: 'Transport', icon: 'car' },
            { id: 7, name: 'Entertainment', icon: 'film' },
            { id: 8, name: 'Miscellaneous', icon: 'receipt' }
        ],
        departments: [
            { id: 1, name: 'Engineering' },
            { id: 2, name: 'Marketing' },
            { id: 3, name: 'Sales' },
            { id: 4, name: 'Human Resources' },
            { id: 5, name: 'Finance' },
            { id: 6, name: 'Operations' }
        ]
    };
    
    // Ensure data directory exists
    function ensureDataDirectoryExists() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log('Data directory created:', DATA_DIR);
        }
    }
    
    // Initialize data if not present
    function initialize() {
        ensureDataDirectoryExists();
        
        if (!fs.existsSync(DATABASE_FILE)) {
            fs.writeFileSync(DATABASE_FILE, JSON.stringify(initialData, null, 2));
            console.log('PesaFlow data initialized at:', DATABASE_FILE);
        } else {
            // Check for version updates and migrate if needed
            const storedData = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
            if (storedData.version !== VERSION) {
                // Future version migration logic could go here
                storedData.version = VERSION;
                fs.writeFileSync(DATABASE_FILE, JSON.stringify(storedData, null, 2));
                console.log('PesaFlow data migrated to version', VERSION);
            }
        }
    }
    
    // Get current data
    function getData() {
        return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    }
    
    // Save data
    function saveData(data) {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
    }
    
    // Generate unique IDs
    function generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }
    
    // Hash password (improved security over client-side version)
    function hashPassword(password, salt = null) {
        if (!salt) {
            salt = crypto.randomBytes(16).toString('hex');
        }
        
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return { hash, salt };
    }
    
    // Verify password
    function verifyPassword(password, hash, salt) {
        const passwordData = hashPassword(password, salt);
        return passwordData.hash === hash;
    }
    
    // Public API
    return {
        // Initialize the storage
        init: function() {
            initialize();
            console.log('PesaFlow Server Storage System initialized');
            return this;
        },
        
        // User Management with MySQL integration
        user: {
            // Create a new user in MySQL database
            create: async function(userData) {
                try {
                    // Hash the password using bcrypt
                    const saltRounds = 10;
                    const passwordHash = await bcrypt.hash(userData.password, saltRounds);
                    
                    // Insert user into MySQL database
                    const [result] = await pool.execute(
                        'INSERT INTO users (first_name, last_name, email, password_hash, role, department_id, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [
                            userData.firstName || '',
                            userData.lastName || '',
                            userData.email,
                            passwordHash,
                            userData.role || 'employee',
                            userData.departmentId || null,
                            userData.phoneNumber || null
                        ]
                    );
                    
                    // Get the newly created user
                    const [users] = await pool.execute(
                        'SELECT user_id, first_name, last_name, email, role, department_id, profile_image, phone_number, created_at, last_login FROM users WHERE user_id = ?',
                        [result.insertId]
                    );
                    
                    console.log('User created in MySQL:', userData.email);
                    return users[0];
                } catch (error) {
                    console.error('Error creating user in MySQL:', error);
                    throw new Error(error.message);
                }
            },
            
            // Authenticate user against MySQL database
            authenticate: async function(email, password) {
                try {
                    // Find user by email
                    const [users] = await pool.execute(
                        'SELECT * FROM users WHERE email = ?',
                        [email]
                    );
                    
                    if (users.length === 0) {
                        return { success: false, message: 'Invalid email or password' };
                    }
                    
                    const user = users[0];
                    
                    // Compare password with stored hash
                    const isMatch = await bcrypt.compare(password, user.password_hash);
                    
                    if (!isMatch) {
                    return { success: false, message: 'Invalid email or password' };
                }
                
                    // Update last login timestamp
                    await pool.execute(
                        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
                        [user.user_id]
                    );
                    
                    // Generate JWT token
                    const token = jwt.sign(
                        { 
                            id: user.user_id, 
                            email: user.email,
                            role: user.role
                        },
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRES_IN }
                    );
                    
                    // Return user without sensitive data
                    const { password_hash, ...safeUser } = user;
                    
                    return { 
                        success: true, 
                        user: safeUser,
                        token
                    };
                } catch (error) {
                    console.error('Authentication error:', error);
                    return { success: false, message: 'Server error during authentication' };
                }
            },
            
            // Get all users from MySQL database
            getAll: async function() {
                try {
                    const [users] = await pool.execute(
                        'SELECT user_id, first_name, last_name, email, role, department_id, profile_image, phone_number, created_at, last_login, is_active FROM users'
                    );
                    return users;
                } catch (error) {
                    console.error('Error getting users from MySQL:', error);
                    throw new Error('Failed to retrieve users');
                }
            },
            
            // Get user by ID from MySQL database
            getById: async function(userId) {
                try {
                    const [users] = await pool.execute(
                        'SELECT user_id, first_name, last_name, email, role, department_id, profile_image, phone_number, created_at, last_login, is_active FROM users WHERE user_id = ?',
                        [userId]
                    );
                    
                    return users.length > 0 ? users[0] : null;
                } catch (error) {
                    console.error('Error getting user by ID from MySQL:', error);
                    throw new Error('Failed to retrieve user');
                }
            },
            
            // Update user in MySQL database
            update: async function(userId, updates) {
                try {
                    let query = 'UPDATE users SET ';
                    const values = [];
                    const updateFields = [];
                    
                    // Build dynamic update query
                    if (updates.firstName) {
                        updateFields.push('first_name = ?');
                        values.push(updates.firstName);
                    }
                    
                    if (updates.lastName) {
                        updateFields.push('last_name = ?');
                        values.push(updates.lastName);
                    }
                    
                    if (updates.email) {
                        updateFields.push('email = ?');
                        values.push(updates.email);
                    }
                    
                    if (updates.role) {
                        updateFields.push('role = ?');
                        values.push(updates.role);
                    }
                    
                    if (updates.departmentId) {
                        updateFields.push('department_id = ?');
                        values.push(updates.departmentId);
                    }
                    
                    if (updates.phoneNumber) {
                        updateFields.push('phone_number = ?');
                        values.push(updates.phoneNumber);
                    }
                    
                    if (updates.profileImage) {
                        updateFields.push('profile_image = ?');
                        values.push(updates.profileImage);
                    }
                    
                    if (updates.isActive !== undefined) {
                        updateFields.push('is_active = ?');
                        values.push(updates.isActive);
                    }
                    
                    // Handle password updates separately with hashing
                if (updates.password) {
                        const saltRounds = 10;
                        const passwordHash = await bcrypt.hash(updates.password, saltRounds);
                        updateFields.push('password_hash = ?');
                        values.push(passwordHash);
                    }
                    
                    // If no fields to update
                    if (updateFields.length === 0) {
                        return false;
                    }
                    
                    query += updateFields.join(', ') + ' WHERE user_id = ?';
                    values.push(userId);
                    
                    // Execute update query
                    const [result] = await pool.execute(query, values);
                    
                    console.log('User updated in MySQL, ID:', userId);
                    return result.affectedRows > 0;
                } catch (error) {
                    console.error('Error updating user in MySQL:', error);
                    throw new Error('Failed to update user');
                }
            },
            
            // Delete user from MySQL database
            delete: async function(userId) {
                try {
                    const [result] = await pool.execute(
                        'DELETE FROM users WHERE user_id = ?',
                        [userId]
                    );
                    
                    console.log('User deleted from MySQL, ID:', userId);
                    return result.affectedRows > 0;
                } catch (error) {
                    console.error('Error deleting user from MySQL:', error);
                    throw new Error('Failed to delete user');
                }
            },
            
            // Verify JWT token
            verifyToken: function(token) {
                try {
                    return jwt.verify(token, JWT_SECRET);
                } catch (error) {
                    console.error('Token verification error:', error);
                    return null;
                }
            }
        },
        
        // Expense Management
        expense: {
            create: function(expenseData) {
                const data = getData();
                const newExpense = {
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    status: 'pending', // pending, approved, rejected
                    ...expenseData
                };
                
                data.expenses.push(newExpense);
                saveData(data);
                
                console.log('Expense created, ID:', newExpense.id);
                return newExpense;
            },
            
            getAll: function(filters = {}) {
                const data = getData();
                let expenses = [...data.expenses];
                
                // Apply filters if any
                if (filters.userId) {
                    expenses = expenses.filter(e => e.userId === filters.userId);
                }
                
                if (filters.status) {
                    expenses = expenses.filter(e => e.status === filters.status);
                }
                
                if (filters.categoryId) {
                    expenses = expenses.filter(e => e.categoryId === filters.categoryId);
                }
                
                if (filters.departmentId) {
                    expenses = expenses.filter(e => e.departmentId === filters.departmentId);
                }
                
                if (filters.dateFrom) {
                    const dateFrom = new Date(filters.dateFrom);
                    expenses = expenses.filter(e => new Date(e.date) >= dateFrom);
                }
                
                if (filters.dateTo) {
                    const dateTo = new Date(filters.dateTo);
                    expenses = expenses.filter(e => new Date(e.date) <= dateTo);
                }
                
                return expenses;
            },
            
            getById: function(expenseId) {
                const data = getData();
                return data.expenses.find(e => e.id === expenseId) || null;
            },
            
            update: function(expenseId, updates) {
                const data = getData();
                const expenseIndex = data.expenses.findIndex(e => e.id === expenseId);
                
                if (expenseIndex === -1) return false;
                
                // Add update timestamp
                updates.updatedAt = new Date().toISOString();
                
                data.expenses[expenseIndex] = { ...data.expenses[expenseIndex], ...updates };
                saveData(data);
                
                console.log('Expense updated, ID:', expenseId);
                return true;
            },
            
            updateStatus: function(expenseId, status, reviewerId, comments = '') {
                const data = getData();
                const expenseIndex = data.expenses.findIndex(e => e.id === expenseId);
                
                if (expenseIndex === -1) return false;
                
                data.expenses[expenseIndex].status = status;
                data.expenses[expenseIndex].reviewerId = reviewerId;
                data.expenses[expenseIndex].reviewDate = new Date().toISOString();
                data.expenses[expenseIndex].comments = comments;
                
                saveData(data);
                
                console.log('Expense status updated:', status, 'ID:', expenseId);
                return true;
            },
            
            delete: function(expenseId) {
                const data = getData();
                const expenseIndex = data.expenses.findIndex(e => e.id === expenseId);
                
                if (expenseIndex === -1) return false;
                
                data.expenses.splice(expenseIndex, 1);
                saveData(data);
                
                console.log('Expense deleted, ID:', expenseId);
                return true;
            },
            
            getStats: function(filters = {}) {
                const expenses = this.getAll(filters);
                
                // Calculate various statistics
                const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                
                // Group by category
                const byCategory = expenses.reduce((acc, exp) => {
                    const categoryId = exp.categoryId;
                    if (!acc[categoryId]) acc[categoryId] = 0;
                    acc[categoryId] += (exp.amount || 0);
                    return acc;
                }, {});
                
                // Group by department
                const byDepartment = expenses.reduce((acc, exp) => {
                    const departmentId = exp.departmentId;
                    if (!acc[departmentId]) acc[departmentId] = 0;
                    acc[departmentId] += (exp.amount || 0);
                    return acc;
                }, {});
                
                // Group by status
                const byStatus = expenses.reduce((acc, exp) => {
                    const status = exp.status;
                    if (!acc[status]) acc[status] = 0;
                    acc[status] += (exp.amount || 0);
                    return acc;
                }, {});
                
                // Group by month
                const byMonth = expenses.reduce((acc, exp) => {
                    const date = new Date(exp.date);
                    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
                    if (!acc[monthKey]) acc[monthKey] = 0;
                    acc[monthKey] += (exp.amount || 0);
                    return acc;
                }, {});
                
                return {
                    totalExpenses: expenses.length,
                    totalAmount: total,
                    byCategory,
                    byDepartment,
                    byStatus,
                    byMonth
                };
            }
        },
        
        // File handling for receipts
        fileStorage: {
            saveReceipt: function(fileBuffer, filename, userId) {
                const userDir = path.join(DATA_DIR, 'receipts', userId.toString());
                
                // Ensure directory exists
                if (!fs.existsSync(userDir)) {
                    fs.mkdirSync(userDir, { recursive: true });
                }
                
                // Generate unique filename
                const uniqueFilename = `${Date.now()}-${filename}`;
                const filePath = path.join(userDir, uniqueFilename);
                
                // Save file
                fs.writeFileSync(filePath, fileBuffer);
                
                // Return relative path for storage in database
                return `/receipts/${userId}/${uniqueFilename}`;
            },
            
            getReceiptPath: function(relativePath) {
                return path.join(DATA_DIR, relativePath);
            },
            
            deleteReceipt: function(relativePath) {
                const fullPath = path.join(DATA_DIR, relativePath);
                
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    return true;
                }
                
                return false;
            }
        },
        
        // Get departments from MySQL
        getDepartments: async function() {
            try {
                const [departments] = await pool.execute('SELECT * FROM departments');
                return departments;
            } catch (error) {
                console.error('Error getting departments from MySQL:', error);
                return [];
            }
        },
        
        // Get categories from MySQL
        getCategories: async function() {
            try {
                const [categories] = await pool.execute('SELECT * FROM categories');
                return categories;
            } catch (error) {
                console.error('Error getting categories from MySQL:', error);
                return [];
            }
        },
        
        // Clear all data (for testing)
        clearAll: function() {
            // Only for development/testing environments
            if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
                if (fs.existsSync(DATABASE_FILE)) {
                    fs.unlinkSync(DATABASE_FILE);
                }
                initialize();
                console.log('All PesaFlow data cleared and reinitialized');
                return true;
            }
            
            console.warn('Attempted to clear data in non-development environment');
            return false;
        },
        
        // Export data
        exportData: function() {
            return getData();
        },
        
        // Import data
        importData: function(data) {
            if (!data || !data.version) {
                console.error('Invalid data format for import');
                return false;
            }
            
            saveData(data);
            console.log('Data imported successfully');
            return true;
        },
        
        // Backup data
        backup: function() {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(DATA_DIR, 'backups');
            
            // Ensure backup directory exists
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = path.join(backupDir, `pesaflow_backup_${timestamp}.json`);
            
            // Copy current data to backup
            fs.copyFileSync(DATABASE_FILE, backupFile);
            
            console.log('Backup created:', backupFile);
            return backupFile;
        },
        
        // Restore from backup
        restore: function(backupFilename) {
            const backupPath = path.join(DATA_DIR, 'backups', backupFilename);
            
            if (!fs.existsSync(backupPath)) {
                console.error('Backup file not found:', backupPath);
                return false;
            }
            
            // Copy backup to current data
            fs.copyFileSync(backupPath, DATABASE_FILE);
            
            console.log('Restored from backup:', backupFilename);
            return true;
        },
        
        // List available backups
        listBackups: function() {
            const backupDir = path.join(DATA_DIR, 'backups');
            
            if (!fs.existsSync(backupDir)) {
                return [];
            }
            
            return fs.readdirSync(backupDir)
                .filter(file => file.startsWith('pesaflow_backup_'))
                .map(file => ({
                    filename: file,
                    timestamp: file.replace('pesaflow_backup_', '').replace('.json', '').replace(/-/g, ':'),
                    path: path.join(backupDir, file)
                }));
        }
    };
})();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize PesaFlow storage
const PesaFlowStorage = PesaFlowServerStorage.init();

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Authenticate user
    const authResult = await PesaFlowServerStorage.user.authenticate(email, password);
    
    if (authResult.success) {
      // Return success with user data and token
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: authResult.user,
        token: authResult.token
      });
    } else {
      // Return authentication failure
      return res.status(401).json({
        success: false,
        message: authResult.message || 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Protected route example - get user dashboard data
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // The user ID is available from the token verification
    const userId = req.user.id;
    
    // Get user details
    const user = await PesaFlowServerStorage.user.getById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user's expenses (you can customize this based on your needs)
    const expenses = await PesaFlowServerStorage.expense.getAll({ userId });
    
    // Get departments and categories for the dashboard
    const departments = await PesaFlowServerStorage.getDepartments();
    const categories = await PesaFlowServerStorage.getCategories();
    
    // Return dashboard data
    return res.status(200).json({
      success: true,
      dashboard: {
        user,
        expenses,
        departments,
        categories,
        // Add any other dashboard data needed
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data'
    });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }
  
  const decoded = PesaFlowServerStorage.user.verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
  
  // Add user info to request
  req.user = decoded;
  next();
}

// Start the server
app.listen(PORT, () => {
  console.log(`PesaFlow server running on port ${PORT}`);
});

module.exports = PesaFlowServerStorage;

// Example of usage:
// ===============================

// const storage = require('./pesaflow-server-storage');
// storage.init();

// // Create a test user
// try {
//     const testUser = storage.user.create({
//         name: 'John Doe',
//         email: 'john@example.com',
//         password: 'password123',
//         department: 'Engineering',
//         role: 'user'
//     });
//     console.log('Test user created:', testUser);
// } catch (err) {
//     console.error('Error creating test user:', err.message);
// }

// Example login function for frontend
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      // Show error message
      alert(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('An error occurred during login');
  }
}

// Example dashboard data fetch
async function fetchDashboardData() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Redirect to login if no token
      window.location.href = '/login';
      return;
    }
    
    const response = await fetch('http://localhost:3000/api/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Render dashboard with the data
      renderDashboard(data.dashboard);
    } else {
      // Handle error or token expiration
      alert(data.message);
      if (response.status === 401 || response.status === 403) {
        // Token invalid or expired, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    alert('An error occurred while loading the dashboard');
  }
}