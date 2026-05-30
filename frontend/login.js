const loginForm = document.getElementById('loginForm');
const statusText = document.getElementById('status');

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  statusText.textContent = 'Logging in...';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      statusText.textContent = data.error || 'Login failed.';
      return;
    }
    if (data.role === 'admin') {
      window.location.href = '/admin.html';
    } else {
      window.location.href = '/';
    }
  } catch (error) {
    statusText.textContent = 'Unable to log in. Please try again.';
  }
});
