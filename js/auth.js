document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => {
    if (user) window.location.href = '/dashboard.html';
  });

  const form = Utils.$('#login-form');
  const errorEl = Utils.$('#login-error');
  const submitBtn = Utils.$('#btn-submit');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    const email = Utils.$('#email').value.trim();
    const password = Utils.$('#password').value;

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).update({
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
      window.location.href = '/dashboard.html';
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.'
      };
      errorEl.textContent = messages[err.code] || 'Login failed. Please try again.';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  if (window.lucide) lucide.createIcons();
});