<script>
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Demo credentials
    const validEmail = 'dandylebson2@gmail.com';
    const validPassword = 'admin123';

    if (email === validEmail && password === validPassword) {
      document.getElementById('message').textContent = '✅ Login successful!';
    } else {
      document.getElementById('message').textContent = '❌ Invalid credentials.';
    }
  });
</script>
