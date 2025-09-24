const SUPABASE_URL = "https://xzcnnmevjcjarriqzajt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y25ubWV2amNqYXJyaXF6YWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTIwNzAsImV4cCI6MjA3MjI4ODA3MH0.Da-bdUNrrH1MFbJDkQh3X30L7UEIeUbR0xHuOzgHRZk"

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log(supabase);




const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signup");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");


const notesSection = document.getElementById("notes-section");
const authSection = document.getElementById("auth-section");
const addNoteBtn = document.getElementById("add-note");
const newTitleInput = document.getElementById("new-title");
const newNoteInput = document.getElementById("new-note");
const notesList = document.getElementById("notes-list");
const notesLoader = document.getElementById("notes-loader");
const notesEmpty = document.getElementById("notes-empty");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("search-btn");




function showToast(message, duration = 2000, type = "info") {
  const toast = document.createElement("div");
  toast.innerText = message;

  // styling
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.padding = "10px 15px";
  toast.style.borderRadius = "5px";
  toast.style.color = "white";
  toast.style.fontFamily = "Arial, sans-serif";
  toast.style.zIndex = "1000";

  if (type === "success") {
    toast.style.background = "green";
  } else if (type === "error") {
    toast.style.background = "red";
  } else if (type === "loading") {
    toast.style.background = "blue";
  } else {
    toast.style.background = "gray";
  }

  document.body.appendChild(toast);

  if (duration !== undefined) {
    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  return toast;
};

function hideToast() {
  const toasts = document.querySelectorAll("body > div");
  toasts.forEach((t) => t.remove());
};



signupBtn.addEventListener("click", async () => {
  showToast("Checking email...", undefined, "loading");

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    hideToast();
    showToast("Please enter email and password", 2500, "error");
    return;
  }

  // Step 1: Check if email already exists by trying login
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  hideToast();

  if (loginData?.user) {
    showToast("❌ This email is already registered. Please login.", 3000, "error");
    return;
  }

  // Step 2: If login failed with invalid creds → safe to signup
  if (loginError && loginError.message.toLowerCase().includes("invalid login credentials")) {
    showToast("Creating your account...", undefined, "loading");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    hideToast();

    if (error) {
      showToast(`❌ ${error.message}`, 3000, "error");
    } else {
      showToast("✅ Signup successful! Check your email inbox.", 3000, "success");
    }
  } else if (loginError) {
    // koi aur error aagya (jaise network ya server issue)
    showToast(`❌ ${loginError.message}`, 3000, "error");
  }
});





loginBtn.addEventListener("click", async () => {
    showToast("Logging in...", undefined, "loading");

    const {error} = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });

    hideToast();

    if (error) {
        showToast(error.message, 2500, "error");
    } else {
        showToast("welcome back!", 1200, "success");
        showNotes();
    }

});

if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    const term = searchInput.value;
    loadNotes(term);
  });
};

// Optional: Press Enter to search
if (searchInput) {
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loadNotes(searchInput.value);
    }
  });
};

async function uploadImage(file, userId) {
  if (!file) return null;

  const fileName = `${userId}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from("notes_images") // 👈 bucket name
    .upload(fileName, file);

  if (error) {
    console.error("Image upload failed:", error.message);
    showToast("Failed to upload image", 2000, "error");
    return null;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("notes_images")
    .getPublicUrl(fileName);

  return publicUrl;
};


logoutBtn.addEventListener("click", async () => {
  showToast("Signing out...", undefined, "loading");
  await supabase.auth.signOut();
  hideToast();
  authSection.style.display = "block";
  notesSection.style.display = "none";
  // Hide logout in header on sign out
  if (logoutBtn) logoutBtn.classList.add("hidden");
  showToast("Signed out", 1200, "success");
});


async function showNotes() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    showToast("Please log in first!", 1800);
    return;
  }

  authSection.style.display = "none";
  notesSection.style.display = "block";
  // Show logout in header when authenticated
  if (logoutBtn) logoutBtn.classList.remove("hidden");
  loadNotes();
};



addNoteBtn.addEventListener("click", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!newTitleInput.value.trim() || !newNoteInput.value.trim()) {
    showToast("Please enter title and note", 1500, "error");
    return;
  }

  if (editState.id) {
    // 📝 Update existing note
    const { error } = await supabase
      .from("notes_app")
      .update({
        title: newTitleInput.value,
        content: newNoteInput.value,
      })
      .eq("id", editState.id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      showToast("Failed to update note", 2000, "error");
      return;
    }

    showToast("Note updated!", 1200, "success");
    editState.id = null;
    addNoteBtn.textContent = "Add Note";
  } else {
    // ➕ Insert new note
    const { error } = await supabase.from("notes_app").insert([
      {
        user_id: user.id,
        title: newTitleInput.value,
        content: newNoteInput.value,
      },
    ]);

    if (error) {
      console.error(error);
      showToast("Failed to add note", 2000, "error");
      return;
    }

    showToast("Note added!", 1200, "success");
  }

  newTitleInput.value = "";
  newNoteInput.value = "";
  loadNotes();
});





let editState = { id: null };

async function loadNotes(searchTerm = "") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  notesList.innerHTML = "";
  notesLoader.classList.remove("hidden");
  notesEmpty.classList.add("hidden");

  const { data: notes, error } = await supabase
    .from("notes_app")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  notesLoader.classList.add("hidden");

  if (error) {
    showToast("Failed to load notes", 2000, "error");
    console.error(error);
    return;
  }

  const filtered = (notes || []).filter((n) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (n.title && n.title.toLowerCase().includes(term)) ||
      (n.content && n.content.toLowerCase().includes(term))
    );
  });

  if (filtered.length === 0) {
    notesEmpty.classList.remove("hidden");
    return;
  }

  filtered.forEach((note) => {
    const li = document.createElement("li");
    li.className =
      "flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-3";

    const text = document.createElement("div");
    text.className = "text-slate-200 flex-1";

    const title = document.createElement("h3");
    title.className = "mb-1 text-slate-100 font-medium";
    title.textContent = note.title || "Untitled";

    const body = document.createElement("div");
    body.className = "text-slate-300";
    body.textContent = note.content || "";

    text.appendChild(title);
    text.appendChild(body);

    // 🔘 Action buttons
    const actions = document.createElement("div");
    actions.className = "flex gap-2";

    // ✏️ Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "text-yellow-400 hover:text-yellow-300";
    editBtn.onclick = () => editNote(note);

    // 🗑️ Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "text-red-400 hover:text-red-300";
    deleteBtn.onclick = () => deleteNote(note.id);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(text);
    li.appendChild(actions);

    notesList.appendChild(li);
  });
};

function editNote(note) {
  newTitleInput.value = note.title;
  newNoteInput.value = note.content;
  editState.id = note.id;
  addNoteBtn.textContent = "Update Note";
};

async function deleteNote(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notes_app")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    showToast("Failed to delete note", 2000, "error");
    return;
  }

  showToast("Note deleted!", 1200, "success");
  loadNotes();
};

window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    showNotes(); // agar user already logged in hai
  } else {
    authSection.style.display = "block";
    notesSection.style.display = "none";
  }
});





















// const getBtn = document.getElementById("get-btn")
// const updateBtn = document.getElementById("update-btn")
// const addBtn = document.getElementById("add-btn")
// const titleInput = document.getElementById("title")
// const contentInput = document.getElementById("content")


// getBtn.addEventListener("click", async () => {
//   const { data, error } = await supabase.from("notes app").select("*");
//   if (error) {
//     alert(error.message);
//     return;
//   }
//   console.log("data -->", data);
// });

// addBtn.addEventListener("click", async() => {
//     console.log(titleInput.value);
//     const data = await supabase.from("notes app").insert([{title: titleInput.value, content: contentInput.value}]);
//     const updateData = await supabase.from("notes app").update({title: "Note 9"})
    
// });





