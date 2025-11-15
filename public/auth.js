function focusInput(input) {
  if (typeof input.focus === 'function') {
    input.focus();
  }
}

export function requirePasscode({
  overlayId = 'loginOverlay',
  formId = 'loginForm',
  inputId = 'loginPasscode',
  errorId = 'loginError',
  onAuthenticated = () => {},
} = {}) {
  const overlay = document.getElementById(overlayId);
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);

  if (!overlay || !form || !input) {
    onAuthenticated();
    return;
  }

  const showOverlay = (message = '') => {
    overlay.classList.remove('hidden');
    if (error) {
      error.textContent = message;
    }
    if (input) {
      input.value = '';
    }
    focusInput(input);
  };

  const hideOverlay = () => {
    overlay.classList.add('hidden');
    if (error) {
      error.textContent = '';
    }
  };

  const authenticateAndProceed = () => {
    hideOverlay();
    onAuthenticated();
  };

  const checkSession = async () => {
    try {
      const response = await fetch('api/session.php', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (response.ok) {
        const body = await response.json();
        if (body.authenticated) {
          authenticateAndProceed();
          return;
        }
      }
    } catch (fetchError) {
      console.error(fetchError);
    }

    showOverlay();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const passcode = input.value.trim();
    if (!passcode) {
      showOverlay('Enter the passcode to continue.');
      return;
    }

    try {
      const response = await fetch('api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ passcode }),
        credentials: 'same-origin',
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body.authenticated) {
        const message = body.message || 'Incorrect passcode. Please try again.';
        showOverlay(message);
        return;
      }

      authenticateAndProceed();
    } catch (networkError) {
      console.error(networkError);
      showOverlay('Unable to verify the passcode. Check your connection.');
    }
  });

  window.addEventListener('auth:required', () => {
    showOverlay();
  });

  checkSession();
}
