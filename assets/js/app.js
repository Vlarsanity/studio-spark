// Enable Supabase if needed later
// const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const layoutInputs = document.querySelectorAll('input[name="layout-choice"]');
  const startBtn = document.getElementById("startSessionBtn");

  function validateForm() {
    const email = emailInput.value.trim();
    const layoutSelected = document.querySelector('input[name="layout-choice"]:checked');
    startBtn.disabled = !(email && layoutSelected);
  }

  emailInput.addEventListener("input", validateForm);
  layoutInputs.forEach(input => input.addEventListener("change", validateForm));

  document.getElementById("start-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const selectedLayout = document.querySelector('input[name="layout-choice"]:checked');

    if (!email || !selectedLayout) {
      document.getElementById("error-message").textContent = "Please complete all fields.";
      return;
    }

    const layout = selectedLayout.value;

    // Save to localStorage
    localStorage.setItem("selectedLayout", layout);
    localStorage.setItem("userEmail", email);

    // Redirect to camera.html
    window.location.href = "camera.html";
  });
});
