const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const PesaFlowServerStorage = require('./server');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize PesaFlow storage
PesaFlowServerStorage.init();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
    
    // Return dashboard data
    return res.status(200).json({
      success: true,
      dashboard: {
        user,
        // Add other dashboard data as needed
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

// Test endpoint to check if server is running
app.get('/api/test', (req, res) => {
  res.json({ message: 'PesaFlow API is working!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`PesaFlow server running on port ${PORT}`);
});