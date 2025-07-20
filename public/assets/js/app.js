// Replace with your Supabase project credentials
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'public-anon-key';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.getElementById("start-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const layout = document.getElementById("layout-choice").value;

  if (!email || !layout) {
    document.getElementById("error-message").textContent = "Please complete all fields.";
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    document.getElementById("error-message").textContent = error.message;
  } else {
    // Store selected layout in localStorage and redirect
    localStorage.setItem("selectedLayout", layout);
    localStorage.setItem("userEmail", email);
    window.location.href = "camera.html"; // Next step
  }
});
