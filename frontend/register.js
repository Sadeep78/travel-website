const registerForm = document.getElementById('registerForm');
const statusText = document.getElementById('status');

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  statusText.textContent = 'Registering...';
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'user' })
    });
    const data = await response.json();
    if (!response.ok) {
      statusText.textContent = data.error || 'Registration failed.';
      return;
    }
    statusText.textContent = data.message;
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1200);
  } catch (error) {
    statusText.textContent = 'Unable to register. Please try again.';
  }
});
