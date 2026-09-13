const SUPABASE_URL = "https://febcvclmvpoogtomlxaz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-28vyy1G2uT9x98vgIsHLA_fhqly00G";
const supabaseLibrary = window.supabase;
const supabaseClient = supabaseLibrary?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;

const authScreen = document.querySelector("#auth-screen");
const appShell = document.querySelector("#app-shell");
const authForm = document.querySelector("#auth-form");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authSubmit = document.querySelector("#auth-submit");
const authToggle = document.querySelector("#auth-toggle");
const authKicker = document.querySelector("#auth-kicker");
const authTitle = document.querySelector("#auth-title");
const authCopy = document.querySelector("#auth-copy");
const authFeedback = document.querySelector("#auth-feedback");
const accountEmail = document.querySelector("#account-email");
const logoutButton = document.querySelector("#logout-button");
const networkStatus = document.querySelector("#network-status");
const networkStatusText = document.querySelector("#network-status-text");
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskAddButton = document.querySelector("#task-add-button");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyCopy = document.querySelector("#empty-copy");
const clearCompletedButton = document.querySelector("#clear-completed");
const progressNumber = document.querySelector("#progress-number");
const taskSummary = document.querySelector("#task-summary");
const shoppingSummary = document.querySelector("#shopping-summary");
const dateDisplay = document.querySelector("#date-display");
const selectedDateLabel = document.querySelector("#selected-date-label");
const dateNavLabel = document.querySelector("#date-nav-label");
const datePicker = document.querySelector("#date-picker");
const prevDateButton = document.querySelector("#prev-date");
const nextDateButton = document.querySelector("#next-date");
const todayDateButton = document.querySelector("#today-date");
const pastDateMessage = document.querySelector("#past-date-message");
const filterButtons = document.querySelectorAll("[data-filter]");
const modeButtons = document.querySelectorAll(".mode-button");
const panelViews = document.querySelectorAll(".panel-view");
const shoppingForm = document.querySelector("#shopping-form");
const shoppingNameInput = document.querySelector("#shopping-name");
const shoppingQuantityInput = document.querySelector("#shopping-quantity");
const shoppingCategoryInput = document.querySelector("#shopping-category");
const shoppingAddButton = document.querySelector("#shopping-add-button");
const shoppingList = document.querySelector("#shopping-list");
const shoppingEmpty = document.querySelector("#shopping-empty");
const clearPurchasedButton = document.querySelector("#clear-purchased");
const shoppingFilterButtons = document.querySelectorAll("[data-shopping-filter]");
const shoppingCategoryFilter = document.querySelector("#shopping-category-filter");
const confirmModal = document.querySelector("#confirm-modal");
const confirmMessage = document.querySelector("#confirm-message");
const confirmCancelButton = document.querySelector("#confirm-cancel");
const confirmDeleteButton = document.querySelector("#confirm-delete");

let currentUser = null;
let tasks = [];
let shoppingItems = [];
let currentFilter = "all";
let shoppingCurrentFilter = "all";
let shoppingCurrentCategory = "all";
let currentMode = "daily";
let selectedDate = getTodayISO();
let authMode = "signin";

function getTodayISO() {
  return toISODate(new Date());
}

function toISODate(dateObject) {
  const year = dateObject.getFullYear();
  const month = String(dateObject.getMonth() + 1).padStart(2, "0");
  const day = String(dateObject.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey || "") ? dateKey : getTodayISO();
}

function isPastDate(dateKey) {
  return normalizeDateKey(dateKey) < getTodayISO();
}

function formatFullDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Today" : new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric"
  }).format(date);
}

function formatDateLabel(dateKey) {
  return dateKey === getTodayISO() ? "Today" : formatFullDate(dateKey);
}

function updateLiveDateTime() {
  dateDisplay.textContent = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit"
  }).format(new Date());
}

function showNetworkStatus(message) {
  networkStatusText.textContent = message;
  networkStatus.hidden = false;
}

function hideNetworkStatus() {
  networkStatus.hidden = true;
}

function showAuthFeedback(message, isError = true) {
  authFeedback.textContent = message;
  authFeedback.classList.toggle("is-error", isError);
  authFeedback.classList.toggle("is-success", !isError);
}

function getAuthErrorMessage(error) {
  if (!error) return "Something went wrong. Please try again.";
  if (error.message) return error.message;
  return "Authentication failed. Please check your details and try again.";
}

function setAuthenticatedView(user) {
  currentUser = user;
  const isAuthenticated = Boolean(user);
  authScreen.hidden = isAuthenticated;
  appShell.hidden = !isAuthenticated;
  accountEmail.textContent = user?.email || "";
  if (!isAuthenticated) {
    tasks = [];
    shoppingItems = [];
    taskList.innerHTML = "";
    shoppingList.innerHTML = "";
  }
}

function applyPastDateState() {
  const shouldDisable = isPastDate(selectedDate);
  [taskInput, taskAddButton, shoppingNameInput, shoppingQuantityInput, shoppingCategoryInput, shoppingAddButton]
    .forEach((element) => { element.disabled = shouldDisable; });
  pastDateMessage.hidden = !shouldDisable;
}

function renderDateHeader() {
  selectedDateLabel.textContent = formatDateLabel(selectedDate);
  dateNavLabel.textContent = formatFullDate(selectedDate);
  datePicker.value = selectedDate;
  document.title = `Daymark | ${formatFullDate(selectedDate)}`;
  applyPastDateState();
}

function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((task) => !task.is_completed);
  if (currentFilter === "completed") return tasks.filter((task) => task.is_completed);
  return tasks;
}

function renderSummary() {
  const completedTaskCount = tasks.filter((task) => task.is_completed).length;
  const purchasedCount = shoppingItems.filter((item) => item.is_purchased).length;
  const remainingTasks = tasks.length - completedTaskCount;
  const remainingItems = shoppingItems.length - purchasedCount;
  taskSummary.textContent = `${remainingTasks} ${remainingTasks === 1 ? "task" : "tasks"} remaining • ${completedTaskCount} completed`;
  shoppingSummary.textContent = `${remainingItems} ${remainingItems === 1 ? "item" : "items"} remaining • ${purchasedCount} purchased`;
  taskSummary.hidden = currentMode !== "daily";
  shoppingSummary.hidden = currentMode !== "shopping";
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  const completedCount = tasks.filter((task) => task.is_completed).length;
  const activeCount = tasks.length - completedCount;
  const completion = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  taskList.innerHTML = "";
  visibleTasks.forEach((task) => taskList.appendChild(renderTask(task)));
  document.querySelector("#all-count").textContent = tasks.length;
  document.querySelector("#active-count").textContent = activeCount;
  document.querySelector("#completed-count").textContent = completedCount;
  progressNumber.textContent = `${completion}%`;
  clearCompletedButton.hidden = completedCount === 0;
  if (tasks.length === 0) {
    emptyTitle.textContent = "Your list is clear.";
    emptyCopy.textContent = "Add a task above and give your day a starting point.";
    emptyState.hidden = false;
  } else if (visibleTasks.length === 0) {
    emptyTitle.textContent = currentFilter === "completed" ? "Nothing finished yet." : "You are all caught up.";
    emptyCopy.textContent = currentFilter === "completed" ? "Completed tasks will show up here." : "A clear list is a powerful place to be.";
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
  }
}

function renderShoppingList() {
  let visibleItems = shoppingItems;
  if (shoppingCurrentFilter === "pending") visibleItems = visibleItems.filter((item) => !item.is_purchased);
  if (shoppingCurrentFilter === "purchased") visibleItems = visibleItems.filter((item) => item.is_purchased);
  if (shoppingCurrentCategory !== "all") visibleItems = visibleItems.filter((item) => item.category === shoppingCurrentCategory);
  const purchasedCount = shoppingItems.filter((item) => item.is_purchased).length;
  shoppingList.innerHTML = "";
  visibleItems.forEach((item) => shoppingList.appendChild(renderShoppingItem(item)));
  clearPurchasedButton.hidden = purchasedCount === 0;
  shoppingEmpty.hidden = visibleItems.length > 0;
  if (visibleItems.length === 0 && shoppingItems.length > 0) {
    shoppingEmpty.querySelector("h3").textContent = "No matching items.";
    shoppingEmpty.querySelector("p").textContent = "Try another category or status filter.";
  } else {
    shoppingEmpty.querySelector("h3").textContent = "Your shopping list is empty.";
    shoppingEmpty.querySelector("p").textContent = "Add the essentials you need for the next trip.";
  }
}

function render() {
  renderTasks();
  renderShoppingList();
  renderSummary();
  renderDateHeader();
}

function renderTask(task) {
  const item = document.createElement("article");
  item.className = `task-item${task.is_completed ? " is-complete" : ""}`;
  const checkButton = document.createElement("button");
  checkButton.className = "task-check";
  checkButton.type = "button";
  checkButton.setAttribute("aria-label", task.is_completed ? `Mark ${task.title} as active` : `Complete ${task.title}`);
  checkButton.textContent = "✓";
  checkButton.addEventListener("click", () => toggleTask(task));
  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.title;
  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-task";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.textContent = "×";
  deleteButton.addEventListener("click", () => deleteTask(task));
  item.append(checkButton, text, deleteButton);
  return item;
}

function renderShoppingItem(item) {
  const card = document.createElement("article");
  card.className = `shopping-item${item.is_purchased ? " is-purchased" : ""}`;
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.is_purchased;
  checkbox.className = "shopping-check";
  checkbox.setAttribute("aria-label", `Mark ${item.item_name} as purchased`);
  checkbox.addEventListener("change", () => toggleShoppingItem(item));
  const content = document.createElement("div");
  content.className = "shopping-copy";
  const name = document.createElement("div");
  name.className = "shopping-name";
  name.textContent = item.item_name;
  const meta = document.createElement("span");
  meta.className = "shopping-meta";
  meta.innerHTML = `<span>${item.quantity || "Qty not set"}</span><span class="category-tag">${item.category}</span>`;
  const deleteButton = document.createElement("button");
  deleteButton.className = "shopping-delete";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${item.item_name}`);
  deleteButton.textContent = "×";
  deleteButton.addEventListener("click", () => deleteShoppingItem(item));
  content.append(name, meta);
  card.append(checkbox, content, deleteButton);
  return card;
}

async function fetchData() {
  if (!currentUser) return;
  showNetworkStatus("Loading your plans...");
  const [tasksResult, shoppingResult] = await Promise.all([
    supabaseClient.from("tasks").select("id, title, task_date, is_completed").eq("task_date", selectedDate).eq("user_id", currentUser.id),
    supabaseClient.from("shopping_items").select("id, item_name, quantity, category, item_date, is_purchased").eq("item_date", selectedDate).eq("user_id", currentUser.id)
  ]);
  if (tasksResult.error) throw tasksResult.error;
  if (shoppingResult.error) throw shoppingResult.error;
  tasks = tasksResult.data || [];
  shoppingItems = shoppingResult.data || [];
  render();
  hideNetworkStatus();
}

async function runDataAction(action) {
  showNetworkStatus("Saving changes...");
  try {
    await action();
    await fetchData();
  } catch (error) {
    showNetworkStatus(error.message || "Could not save your changes.");
  }
}

function closeConfirmationModal() {
  confirmModal.classList.remove("is-visible");
  confirmModal.hidden = true;
  confirmModal.setAttribute("aria-hidden", "true");
  confirmDeleteButton.onclick = null;
  confirmCancelButton.onclick = null;
  confirmModal.onclick = null;
}

function showConfirmationDialog(message) {
  return new Promise((resolve) => {
    confirmMessage.textContent = message;
    confirmModal.hidden = false;
    confirmModal.classList.add("is-visible");
    confirmModal.setAttribute("aria-hidden", "false");
    const finish = (confirmed) => {
      closeConfirmationModal();
      document.removeEventListener("keydown", handleEscape);
      resolve(confirmed);
    };
    const handleEscape = (event) => { if (event.key === "Escape") finish(false); };
    document.addEventListener("keydown", handleEscape);
    confirmDeleteButton.onclick = () => finish(true);
    confirmCancelButton.onclick = () => finish(false);
    confirmModal.onclick = (event) => { if (event.target === confirmModal) finish(false); };
  });
}

async function addTask(event) {
  event.preventDefault();
  if (isPastDate(selectedDate)) return;
  const title = taskInput.value.trim();
  if (!title) return;
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("tasks").insert({ title, task_date: selectedDate, is_completed: false, user_id: currentUser.id });
    if (error) throw error;
  });
  taskForm.reset();
  taskInput.focus();
}

async function toggleTask(task) {
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("tasks").update({ is_completed: !task.is_completed }).eq("id", task.id).eq("user_id", currentUser.id);
    if (error) throw error;
  });
}

async function deleteTask(task) {
  if (!await showConfirmationDialog(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) return;
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("tasks").delete().eq("id", task.id).eq("user_id", currentUser.id);
    if (error) throw error;
  });
}

async function clearCompleted() {
  if (!await showConfirmationDialog("Are you sure you want to clear completed tasks? This action cannot be undone.")) return;
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("tasks").delete().eq("task_date", selectedDate).eq("user_id", currentUser.id).eq("is_completed", true);
    if (error) throw error;
  });
}

async function addShoppingItem(event) {
  event.preventDefault();
  if (isPastDate(selectedDate)) return;
  const itemName = shoppingNameInput.value.trim();
  if (!itemName) return;
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("shopping_items").insert({ item_name: itemName, quantity: shoppingQuantityInput.value.trim(), category: shoppingCategoryInput.value || "Groceries", item_date: selectedDate, is_purchased: false, user_id: currentUser.id });
    if (error) throw error;
  });
  shoppingForm.reset();
  shoppingNameInput.focus();
}

async function toggleShoppingItem(item) {
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("shopping_items").update({ is_purchased: !item.is_purchased }).eq("id", item.id).eq("user_id", currentUser.id);
    if (error) throw error;
  });
}

async function deleteShoppingItem(item) {
  if (!await showConfirmationDialog(`Are you sure you want to delete "${item.item_name}"? This action cannot be undone.`)) return;
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("shopping_items").delete().eq("id", item.id).eq("user_id", currentUser.id);
    if (error) throw error;
  });
}

async function clearPurchasedItems() {
  if (!await showConfirmationDialog("Are you sure you want to clear purchased shopping items? This action cannot be undone.")) return;
  await runDataAction(async () => {
    const { error } = await supabaseClient.from("shopping_items").delete().eq("item_date", selectedDate).eq("user_id", currentUser.id).eq("is_purchased", true);
    if (error) throw error;
  });
}

function setFilter(event) {
  currentFilter = event.currentTarget.dataset.filter;
  filterButtons.forEach((button) => button.classList.toggle("is-active", button === event.currentTarget));
  renderTasks();
  renderSummary();
}

function setShoppingFilter(event) {
  shoppingCurrentFilter = event.currentTarget.dataset.shoppingFilter;
  shoppingFilterButtons.forEach((button) => button.classList.toggle("is-active", button === event.currentTarget));
  renderShoppingList();
  renderSummary();
}

function setShoppingCategoryFilter(event) {
  shoppingCurrentCategory = event.target.value;
  renderShoppingList();
}

async function changeDate(offset) {
  const date = new Date(`${selectedDate}T12:00:00`);
  date.setDate(date.getDate() + offset);
  selectedDate = toISODate(date);
  await fetchData();
}

async function handleDateInput(event) {
  selectedDate = normalizeDateKey(event.target.value);
  await fetchData();
}

function setMode(mode) {
  currentMode = mode;
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  panelViews.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === mode));
  renderSummary();
}

function updateAuthMode() {
  const isSignIn = authMode === "signin";
  authKicker.textContent = isSignIn ? "Welcome back" : "Start with Daymark";
  authTitle.textContent = isSignIn ? "Make room for what matters." : "Build a calmer daily rhythm.";
  authCopy.textContent = isSignIn ? "Sign in to keep your plans available wherever you are." : "Create an account to keep your tasks and lists in the cloud.";
  authSubmit.textContent = isSignIn ? "Sign in" : "Create account";
  authToggle.textContent = isSignIn ? "Need an account? Sign up" : "Already have an account? Sign in";
  authPassword.autocomplete = isSignIn ? "current-password" : "new-password";
  authFeedback.textContent = "";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  authFeedback.textContent = "";
  authFeedback.classList.remove("is-error", "is-success");
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email) {
    showAuthFeedback("Please enter your email address.");
    authEmail.focus();
    return;
  }

  if (password.length < 6) {
    showAuthFeedback("Password should be at least 6 characters.");
    authPassword.focus();
    return;
  }

  if (!supabaseClient) {
    showAuthFeedback("The cloud service is unavailable. Check your connection and reload.");
    return;
  }
  authSubmit.disabled = true;
  showAuthFeedback(authMode === "signin" ? "Signing you in..." : "Creating your account...", false);
  const credentials = { email, password };

  try {
    if (authMode === "signin") {
      console.log("[Auth] Signing in", { email });
      const { data, error } = await supabaseClient.auth.signInWithPassword(credentials);
      if (error) throw error;
      console.log("[Auth] Sign-in succeeded", { userId: data.user?.id, hasSession: Boolean(data.session) });
      if (data.session) await handleAuthState("SIGNED_IN", data.session);
      return;
    }

    console.log("[Auth] Signing up", { email });
    const { data, error } = await supabaseClient.auth.signUp(credentials);
    if (error) throw error;
    console.log("[Auth] Sign-up succeeded", { userId: data.user?.id, hasSession: Boolean(data.session) });

    if (data.session) {
      const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
      if (sessionError) throw sessionError;
      console.log("[Auth] Session established after sign-up");
      await handleAuthState("SIGNED_IN", data.session);
    } else {
      showAuthFeedback("Account created! Please check your email to verify before logging in.", false);
    }
  } catch (error) {
    console.error("[Auth] Authentication request failed", error);
    showAuthFeedback(getAuthErrorMessage(error));
  } finally {
    authSubmit.disabled = false;
  }
}

async function handleAuthState(event, session) {
  console.log("[Auth] State changed", { event, hasSession: Boolean(session), userId: session?.user?.id });
  setAuthenticatedView(session?.user || null);
  if (!session?.user) {
    hideNetworkStatus();
    return;
  }

  try {
    await fetchData();
  } catch (error) {
    console.error("[Auth] Dashboard load failed", error);
    showNetworkStatus(getAuthErrorMessage(error));
  }
}

filterButtons.forEach((button) => button.addEventListener("click", setFilter));
shoppingFilterButtons.forEach((button) => button.addEventListener("click", setShoppingFilter));
shoppingCategoryFilter.addEventListener("change", setShoppingCategoryFilter);
prevDateButton.addEventListener("click", () => changeDate(-1));
nextDateButton.addEventListener("click", () => changeDate(1));
todayDateButton.addEventListener("click", async () => { selectedDate = getTodayISO(); await fetchData(); });
datePicker.addEventListener("change", handleDateInput);
taskForm.addEventListener("submit", addTask);
clearCompletedButton.addEventListener("click", clearCompleted);
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
shoppingForm.addEventListener("submit", addShoppingItem);
clearPurchasedButton.addEventListener("click", clearPurchasedItems);

function initializeAuth() {
  authForm.addEventListener("submit", handleAuthSubmit);
  authToggle.addEventListener("click", () => {
    authMode = authMode === "signin" ? "signup" : "signin";
    updateAuthMode();
  });
  logoutButton.addEventListener("click", async () => {
    if (!supabaseClient) return;
    console.log("[Auth] Signing out", { userId: currentUser?.id });
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error("[Auth] Sign-out failed", error);
  });

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log("[Auth] onAuthStateChange event", event, { hasSession: Boolean(session) });
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)) {
        handleAuthState(event, session);
      }
    });
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("[Auth] Initial session lookup failed", error);
        showAuthFeedback(getAuthErrorMessage(error));
        return;
      }
      console.log("[Auth] Initial session lookup complete", { hasSession: Boolean(data.session) });
      handleAuthState("INITIAL_SESSION", data.session);
    }).catch((error) => {
      console.error("[Auth] Initial session lookup threw", error);
      showAuthFeedback(getAuthErrorMessage(error));
    });
  } else {
    showAuthFeedback("The cloud service is unavailable. Check your connection and reload.");
  }
}

renderDateHeader();
setMode(currentMode);
updateAuthMode();
updateLiveDateTime();
setInterval(updateLiveDateTime, 60000);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAuth, { once: true });
} else {
  initializeAuth();
}