const { chromium } = require('playwright');

(async () => {
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false, // Set to false to see the browser
    slowMo: 500 // Slow down actions to observe them
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Starting site testing...\n');
  
  try {
    // Navigate to the site
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('   ✓ Successfully loaded the page\n');
    
    // Take screenshot of landing page
    await page.screenshot({ path: 'landing_page.png' });
    
    // Look for login form elements
    console.log('2. Looking for login form...');
    
    // Try different possible selectors for email/username field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      'input[id*="email" i]',
      'input[id*="username" i]',
      '#email',
      '#username'
    ];
    
    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        emailField = await page.waitForSelector(selector, { timeout: 2000 });
        if (emailField) {
          console.log(`   ✓ Found email field with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!emailField) {
      console.log('   ⚠ Could not find email field directly, checking for login button/link first...');
      
      // Check if we need to click a login button/link first
      const loginLinkSelectors = [
        'a:has-text("Login")',
        'button:has-text("Login")',
        'a:has-text("Sign In")',
        'button:has-text("Sign In")',
        'a[href*="login"]',
        'a[href*="signin"]'
      ];
      
      for (const selector of loginLinkSelectors) {
        try {
          const loginLink = await page.$(selector);
          if (loginLink) {
            console.log(`   Found login link/button: ${selector}`);
            await loginLink.click();
            await page.waitForTimeout(2000);
            
            // Try to find email field again
            for (const emailSelector of emailSelectors) {
              try {
                emailField = await page.waitForSelector(emailSelector, { timeout: 2000 });
                if (emailField) {
                  console.log(`   ✓ Found email field after clicking login: ${emailSelector}`);
                  break;
                }
              } catch (e) {
                // Continue
              }
            }
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    if (emailField) {
      // Fill in email
      await emailField.fill('dhruvkaushik9457@gmail.com');
      console.log('   ✓ Filled email field\n');
      
      // Find password field
      console.log('3. Looking for password field...');
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="password" i]',
        'input[id*="password" i]',
        '#password'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await page.waitForSelector(selector, { timeout: 2000 });
          if (passwordField) {
            console.log(`   ✓ Found password field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (passwordField) {
        await passwordField.fill('Dhruv@9457');
        console.log('   ✓ Filled password field\n');
        
        // Find and click submit button
        console.log('4. Looking for submit button...');
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("Login")',
          'button:has-text("Sign In")',
          'button:has-text("Submit")',
          'input[type="submit"]'
        ];
        
        let submitButton = null;
        for (const selector of submitSelectors) {
          try {
            submitButton = await page.$(selector);
            if (submitButton) {
              console.log(`   ✓ Found submit button: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
        
        if (submitButton) {
          await submitButton.click();
          console.log('   ✓ Clicked submit button\n');
          
          // Wait for navigation or login to complete
          console.log('5. Waiting for login to complete...');
          await page.waitForTimeout(3000);
          
          // Check if login was successful
          const currentUrl = page.url();
          console.log(`   Current URL: ${currentUrl}`);
          
          // Take screenshot after login
          await page.screenshot({ path: 'after_login.png' });
          console.log('   ✓ Screenshot saved as after_login.png\n');
        } else {
          console.log('   ⚠ Could not find submit button\n');
        }
      } else {
        console.log('   ⚠ Could not find password field\n');
      }
    } else {
      console.log('   ⚠ Could not find login form on the page\n');
    }
    
    // Test site features
    console.log('6. Testing site features...\n');
    
    // Check page structure
    console.log('   Analyzing page structure:');
    
    // Check for navigation/menu
    const navElements = await page.$$('nav, header, [role="navigation"], .navbar, .nav, .menu');
    console.log(`   - Found ${navElements.length} navigation elements`);
    
    // Check for main content areas
    const mainContent = await page.$$('main, [role="main"], .content, #content');
    console.log(`   - Found ${mainContent.length} main content areas`);
    
    // Check for buttons and interactive elements
    const buttons = await page.$$('button, a[href], input[type="button"]');
    console.log(`   - Found ${buttons.length} clickable elements`);
    
    // Check for forms
    const forms = await page.$$('form');
    console.log(`   - Found ${forms.length} forms`);
    
    // Get all links
    const links = await page.$$eval('a[href]', links => 
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.href
      })).filter(link => link.text)
    );
    
    console.log(`\n   Links found on page (${links.length} total):`);
    links.slice(0, 10).forEach(link => {
      console.log(`   - ${link.text}: ${link.href}`);
    });
    if (links.length > 10) {
      console.log(`   ... and ${links.length - 10} more`);
    }
    
    // Test for common issues
    console.log('\n7. Checking for common issues:\n');
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Check for broken images
    const images = await page.$$('img');
    console.log(`   Checking ${images.length} images...`);
    let brokenImages = 0;
    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src) {
        try {
          const response = await page.evaluate(async (src) => {
            try {
              const res = await fetch(src);
              return res.ok;
            } catch {
              return false;
            }
          }, src);
          if (!response) {
            brokenImages++;
            console.log(`   ⚠ Broken image: ${src}`);
          }
        } catch (e) {
          // Skip
        }
      }
    }
    if (brokenImages === 0) {
      console.log('   ✓ All images loaded successfully');
    }
    
    // Check page load time
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart
      };
    });
    
    console.log('\n   Performance metrics:');
    console.log(`   - DOM Interactive: ${performanceMetrics.domInteractive}ms`);
    console.log(`   - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`   - Page Load Complete: ${performanceMetrics.loadComplete}ms`);
    
    // Check for accessibility issues
    console.log('\n   Basic accessibility checks:');
    
    // Check for alt text on images
    const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
    if (imagesWithoutAlt > 0) {
      console.log(`   ⚠ ${imagesWithoutAlt} images without alt text`);
    } else {
      console.log('   ✓ All images have alt text');
    }
    
    // Check for form labels
    const inputsWithoutLabels = await page.$$eval('input:not([type="hidden"]):not([type="submit"]):not([type="button"])', inputs => {
      return inputs.filter(input => {
        const id = input.id;
        if (!id) return true;
        const label = document.querySelector(`label[for="${id}"]`);
        return !label;
      }).length;
    });
    
    if (inputsWithoutLabels > 0) {
      console.log(`   ⚠ ${inputsWithoutLabels} form inputs without labels`);
    } else {
      console.log('   ✓ All form inputs have labels');
    }
    
    // Check for heading hierarchy
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', headings => {
      return headings.map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent.trim()
      }));
    });
    
    console.log(`\n   Heading structure (${headings.length} headings):`);
    headings.forEach(h => {
      console.log(`   ${'  '.repeat(h.level - 1)}H${h.level}: ${h.text.substring(0, 50)}${h.text.length > 50 ? '...' : ''}`);
    });
    
    // Test responsive design
    console.log('\n8. Testing responsive design:');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `responsive_${viewport.name.toLowerCase()}.png` });
      console.log(`   ✓ Tested ${viewport.name} view (${viewport.width}x${viewport.height})`);
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n   ⚠ Console errors detected:');
      consoleErrors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    console.log('\n✅ Testing completed!');
    console.log('Screenshots saved: landing_page.png, after_login.png, responsive_*.png');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close browser
    await browser.close();
  }
})();
