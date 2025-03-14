// Main JavaScript for PesaFlow Management System button interactions
document.addEventListener('DOMContentLoaded', function() {
    // =========================================
    // Navigation & Smooth Scrolling
    // =========================================
    const navLinks = document.querySelectorAll('.nav-links a, .hero-buttons a, .cta a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Only process internal links
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    // Smooth scroll to target
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Offset for header
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // =========================================
    // Login Form Interactions
    // =========================================
    const loginForm = document.querySelector('.login-form form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Simple validation
            if (!email || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            // Simulate login process
            showNotification('Logging in...', 'info');
            
            // In a real application, you would send this to your backend
            setTimeout(() => {
                // Mock login success
                showNotification('Login successful! Redirecting...', 'success');
                
                // Redirect would happen here in production
                setTimeout(() => {
                    loginForm.reset();
                }, 2000);
            }, 1500);
        });
    }

    // =========================================
    // Demo Request & Signup Buttons
    // =========================================
    const demoButton = document.querySelector('a[href="#demo"]');
    const signupButtons = document.querySelectorAll('a[href="#signup"]');
    
    if (demoButton) {
        demoButton.addEventListener('click', function(e) {
            e.preventDefault();
            showModal('Request a Demo', `
                <form id="demo-form">
                    <div class="form-group">
                        <label for="demo-name">Full Name</label>
                        <input type="text" id="demo-name" class="form-control" placeholder="Enter your name" required>
                    </div>
                    <div class="form-group">
                        <label for="demo-email">Email Address</label>
                        <input type="email" id="demo-email" class="form-control" placeholder="Enter your email" required>
                    </div>
                    <div class="form-group">
                        <label for="demo-company">Company</label>
                        <input type="text" id="demo-company" class="form-control" placeholder="Enter your company name" required>
                    </div>
                    <div class="form-group">
                        <label for="demo-message">How can we help?</label>
                        <textarea id="demo-message" class="form-control" rows="3" placeholder="Tell us about your needs"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Request</button>
                </form>
            `);
            
            // Handle demo form submission
            document.getElementById('demo-form').addEventListener('submit', function(e) {
                e.preventDefault();
                showNotification('Demo request submitted! We\'ll contact you soon.', 'success');
                closeModal();
            });
        });
    }
    
    signupButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            showModal('Create an Account', `
                <form id="signup-form">
                    <div class="form-group">
                        <label for="signup-name">Full Name</label>
                        <input type="text" id="signup-name" class="form-control" placeholder="Enter your name" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-email">Email Address</label>
                        <input type="email" id="signup-email" class="form-control" placeholder="Enter your email" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" class="form-control" placeholder="Choose a password" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-password-confirm">Confirm Password</label>
                        <input type="password" id="signup-password-confirm" class="form-control" placeholder="Confirm your password" required>
                    </div>
                    <div class="form-group">
                        <input type="checkbox" id="terms" required>
                        <label for="terms">I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></label>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button>
                </form>
            `);
            
            // Handle signup form submission
            document.getElementById('signup-form').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const password = document.getElementById('signup-password').value;
                const confirmPassword = document.getElementById('signup-password-confirm').value;
                
                if (password !== confirmPassword) {
                    showNotification('Passwords do not match', 'error');
                    return;
                }
                
                showNotification('Account created successfully!', 'success');
                closeModal();
            });
        });
    });

    // =========================================
    // Feature Card Hover Effects
    // =========================================
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
            this.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        });
    });

    // =========================================
    // Utility Functions
    // =========================================
    // Create modal container if it doesn't exist
    if (!document.querySelector('.modal-container')) {
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.style.display = 'none';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalContainer.style.zIndex = '1000';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        document.body.appendChild(modalContainer);
    }

    // Create notification container if it doesn't exist
    if (!document.querySelector('.notification-container')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1001';
        document.body.appendChild(notificationContainer);
    }

    // Function to show modal
    function showModal(title, content) {
        const modalContainer = document.querySelector('.modal-container');
        modalContainer.innerHTML = `
            <div class="modal-content" style="background-color: white; border-radius: 8px; max-width: 500px; width: 90%; padding: 2rem; position: relative;">
                <span class="modal-close" style="position: absolute; top: 10px; right: 15px; font-size: 1.5rem; cursor: pointer;">&times;</span>
                <h2 style="margin-bottom: 1.5rem; color: var(--primary);">${title}</h2>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        modalContainer.style.display = 'flex';
        
        // Close button functionality
        document.querySelector('.modal-close').addEventListener('click', closeModal);
        
        // Close when clicking outside
        modalContainer.addEventListener('click', function(e) {
            if (e.target === modalContainer) {
                closeModal();
            }
        });
    }

    // Function to close modal
    function closeModal() {
        const modalContainer = document.querySelector('.modal-container');
        modalContainer.style.display = 'none';
    }

    // Function to show notification
    function showNotification(message, type = 'info') {
        const notificationContainer = document.querySelector('.notification-container');
        
        const colors = {
            'success': '#4caf50',
            'error': '#f44336',
            'info': '#1a73e8',
            'warning': '#ff9800'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.style.color = 'white';
        notification.style.padding = '1rem';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        notification.style.display = 'flex';
        notification.style.justifyContent = 'space-between';
        notification.style.alignItems = 'center';
        notification.style.minWidth = '300px';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.style.transition = 'opacity 0.3s, transform 0.3s';
        
        notification.innerHTML = `
            <div>${message}</div>
            <button style="background: none; border: none; color: white; cursor: pointer; font-size: 1rem;">&times;</button>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Close button functionality
        notification.querySelector('button').addEventListener('click', function() {
            removeNotification(notification);
        });
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            removeNotification(notification);
        }, 5000);
    }

    // Function to remove notification with animation
    function removeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
});