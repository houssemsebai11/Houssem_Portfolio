/**
 * Supabase Integration for Contact Form
 * This file handles form submissions to Supabase
 */

// Supabase configuration helpers
function getSupabaseConfig() {
  return {
    url: window.SUPABASE_URL || '',
    anonKey: window.SUPABASE_ANON_KEY || ''
  };
}

// Initialize Supabase client (if using Supabase JS library)
let supabaseClient = null;

function getSupabaseClient() {
  if (typeof supabase === 'undefined') return null;
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;
  return supabase.createClient(config.url, config.anonKey);
}

/**
 * Submit contact form to Supabase
 */
async function submitFormToSupabase(formData) {
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message')
  };

  try {
    // Option 1: Use Supabase JS client (if loaded)
    supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      const { data: result, error } = await supabaseClient
        .from('contact_submissions')
        .insert([data])
        .select();

      if (error) throw error;
      return { success: true, data: result };
    }

    // Option 2: Use fetch API directly
    const config = getSupabaseConfig();
    const response = await fetch(`${config.url}/rest/v1/contact_submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit form');
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Supabase submission error:', error);
    throw error;
  }
}

/**
 * Submit form via backend API (recommended)
 */
async function submitFormViaAPI(formData) {
  // Skip API if explicitly set to null
  if (window.CHATBOT_API_URL === null) {
    throw new Error('API disabled - using direct Supabase only');
  }

  const apiUrl = window.CHATBOT_API_URL || 'http://localhost:3000/api';

  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message')
  };

  try {
    const response = await fetch(`${apiUrl}/submit-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Form submitted to Supabase via API:', result);
    return result;
  } catch (error) {
    console.warn('⚠️ API submission failed:', error.message);
    throw error; // Re-throw to trigger fallback
  }
}

/**
 * Submit directly to Supabase (fallback method)
 */
async function submitFormDirectToSupabase(formData) {
  const config = getSupabaseConfig();

  // Check if Supabase credentials are configured
  if (!config.url || !config.anonKey ||
      config.url === 'your_supabase_url' ||
      config.anonKey === 'your_supabase_anon_key') {
    throw new Error('Supabase credentials not configured');
  }

  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message')
  };

  try {
    const response = await fetch(`${config.url}/rest/v1/contact_submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Supabase error: ${response.status} - ${errorData.message || errorData.error_description || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Form submitted directly to Supabase:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Direct Supabase submission error:', error);
    throw error;
  }
}

// Integrate with existing form handler
(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormIntegration);
  } else {
    initFormIntegration();
  }

  function initFormIntegration() {
    const forms = document.querySelectorAll('.php-email-form');
    
    forms.forEach(form => {
      let submissionInProgress = false;

      // Function to submit to Supabase with fallback
      async function submitToSupabase(formData) {
        if (submissionInProgress) return;
        submissionInProgress = true;
        
        try {
          // Try API first
          try {
            const result = await submitFormViaAPI(formData);
            console.log('✅ Form submitted successfully via API');
            return result;
          } catch (apiError) {
            console.log('🔄 API failed, trying direct Supabase...', apiError.message);
            // If API fails, try direct Supabase
            try {
              const result = await submitFormDirectToSupabase(formData);
              console.log('✅ Form submitted successfully via direct Supabase');
              return result;
            } catch (supabaseError) {
              // Both methods failed
              console.error('❌ Both API and direct Supabase submission failed:', {
                apiError: apiError.message,
                supabaseError: supabaseError.message
              });
              throw new Error('Unable to save to database. Please ensure either the API server is running or Supabase credentials are configured.');
            }
          }
        } catch (error) {
          console.error('❌ Form submission to database failed:', error.message);
          throw error;
        } finally {
          submissionInProgress = false;
        }
      }
      
      // Method 1: Intercept form submission
      form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission
        event.stopPropagation(); // Stop event bubbling

        const formData = new FormData(this);

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const loadingDiv = form.querySelector('.loading');
        const errorDiv = form.querySelector('.error-message');
        const sentDiv = form.querySelector('.sent-message');

        if (submitButton) submitButton.disabled = true;
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
        if (sentDiv) sentDiv.style.display = 'none';

        try {
          // Submit to Supabase
          await submitToSupabase(formData);

          // Show success message
          if (loadingDiv) loadingDiv.style.display = 'none';
          if (sentDiv) {
            sentDiv.style.display = 'block';
            sentDiv.classList.add('d-block');
          }

          // Reset form after successful submission
          form.reset();

        } catch (error) {
          // Show error message
          if (loadingDiv) loadingDiv.style.display = 'none';
          if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = `Failed to send message: ${error.message || 'Please try again.'}`;
            errorDiv.classList.add('d-block');
          }
          console.error('Form submission error:', error);
        } finally {
          // Re-enable submit button
          if (submitButton) submitButton.disabled = false;
        }
      }, true); // Use capture phase to run before existing handler
      
      // Method 2: Also listen for successful PHP submission as backup
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const sentMessage = form.querySelector('.sent-message');
            if (sentMessage && sentMessage.classList.contains('d-block') && !submissionInProgress) {
              // Form was successfully submitted via PHP
              // Also submit to Supabase if not already done
              const formData = new FormData(form);
              submitToSupabase(formData).catch(err => {
                // Already logged
              });
            }
          }
        });
      });
      
      const sentMessageDiv = form.querySelector('.sent-message');
      if (sentMessageDiv) {
        observer.observe(sentMessageDiv, { attributes: true });
      }
    });
  }
})();
