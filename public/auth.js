const PASSCODE = '1562';
const STORAGE_KEY = 'clockin:passcode-validated';

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

  const unlock = () => {
    overlay.classList.add('hidden');
    sessionStorage.setItem(STORAGE_KEY, 'true');
    onAuthenticated();
  };

  if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
    unlock();
    return;
  }

  overlay.classList.remove('hidden');
  focusInput(input);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (input.value.trim() === PASSCODE) {
      if (error) {
        error.textContent = '';
      }
      unlock();
    } else {
      if (error) {
        error.textContent = 'Incorrect passcode. Please try again.';
      }
      input.value = '';
      focusInput(input);
    }
  });
}
