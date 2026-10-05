// supabase project password : L38sW3NcSmIvyV7s

const SUPABASE_URL = "https://rakvlbrcolswkwrvgrja.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJha3ZsYnJjb2xzd2t3cnZncmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODY4MzgsImV4cCI6MjEwNjc2MjgzOH0.fNyqGldGEoxZt0JqLjvkfotHNHXd2_QlWwKGL2Q2mv4";

const supabaseLibrary = window.supabase;
const supabaseClient = supabaseLibrary?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;


const $ = (selector) => document.querySelector(selector);
const authScreen = $("#auth-screen");
const appShell = $("#app-shell");
const authForm = $("#auth-form");
const authEmail = $("#auth-email");
const authPassword = $("#auth-password");
const authSubmit = $("#auth-submit");
const authToggle = $("#auth-toggle");
const authKicker = $("#auth-kicker");
const authTitle = $("#auth-title");
const authCopy = $("#auth-copy");
const authFeedback = $("#auth-feedback");
const accountEmail = $("#account-email");
const networkStatus = $("#network-status");
const networkStatusText = $("#network-status-text");
const shoppingForm = $("#shopping-form");
const shoppingName = $("#shopping-name");
const shoppingQuantity = $("#shopping-quantity");
const shoppingList = $("#shopping-list");
const shoppingEmpty = $("#shopping-empty");
const filterButtons = document.querySelectorAll("[data-filter]");
const viewButtons = document.querySelectorAll("[data-view]");
const billCreateForm = $("#bill-create-form");
const newBillTitle = $("#new-bill-title");
const billList = $("#bill-list");
const billEmpty = $("#bill-empty");
const billContent = $("#bill-content");
const billDetailEmpty = $("#bill-detail-empty");
const recordModal = $("#record-modal");
const recordForm = $("#record-form");
const targetBill = $("#target-bill");
const modalNewBillWrap = $("#modal-new-bill-wrap");
const modalNewBill = $("#modal-new-bill");
const actualQty = $("#actual-qty");
const qtyUnit = $("#qty-unit");
const unitRate = $("#unit-rate");
const priceBasis = $("#price-basis");
const discountValue = $("#discount-value");
const subtotalPreview = $("#subtotal-preview");
const recordError = $("#record-error");
const editModal = $("#edit-item-modal");
const editForm = $("#edit-item-form");
const editName = $("#edit-item-name");
const editQty = $("#edit-item-qty");
const confirmModal = $("#confirm-modal");
const confirmMessage = $("#confirm-message");

let currentUser = null;
let authMode = "signin";
let currentView = "shopping";
let currentFilter = "all";
let shoppingItems = [];
let bills = [];
let billItems = [];
let selectedBillId = null;
let pendingShoppingItem = null;
let editingShoppingItem = null;
let confirmAction = null;
let networkTimer = null;

function formatMoney(value) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function showStatus(message, persistent = false) {
  networkStatusText.textContent = message;
  networkStatus.hidden = false;
  window.clearTimeout(networkTimer);
  if (!persistent) networkTimer = window.setTimeout(() => { networkStatus.hidden = true; }, 3500);
}

function setSaveStatus(message) {
  $("#save-status").textContent = message;
}

function handleError(error, context = "Could not save your changes.") {
  console.error(context, error);
  showStatus(error?.message || context);
}

function setAuthenticatedView(user) {
  currentUser = user;
  authScreen.hidden = Boolean(user);
  appShell.hidden = !user;
  accountEmail.textContent = user?.email || "";
  if (!user) {
    shoppingItems = [];
    bills = [];
    billItems = [];
    selectedBillId = null;
    renderAll();
  }
}

function showModal(modal) {
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function hideModal(modal) {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  if (![recordModal, editModal, confirmModal].some((element) => !element.hidden)) document.body.classList.remove("modal-open");
}

function closeRecordModal() {
  hideModal(recordModal);
  pendingShoppingItem = null;
  recordError.textContent = "";
  recordForm.reset();
  updateSubtotal();
  renderShopping();
}

function getVisibleShoppingItems() {
  if (currentFilter === "pending") return shoppingItems.filter((item) => !item.is_marked);
  if (currentFilter === "marked") return shoppingItems.filter((item) => item.is_marked);
  return shoppingItems;
}

function renderShopping() {
  const visibleItems = getVisibleShoppingItems();
  shoppingList.replaceChildren();
  visibleItems.forEach((item) => shoppingList.append(renderShoppingItem(item)));
  shoppingEmpty.hidden = visibleItems.length > 0;
  $("#shopping-count").textContent = `${shoppingItems.filter((item) => !item.is_marked).length} to buy`;
  $("#list-hint").textContent = `${shoppingItems.filter((item) => item.is_marked).length} recorded`;
  shoppingEmpty.querySelector("h3").textContent = shoppingItems.length && !visibleItems.length ? "Nothing in this view" : "Your list starts here";
  shoppingEmpty.querySelector("p").textContent = shoppingItems.length && !visibleItems.length ? "Choose another filter to see your items." : "Add the items you want to pick up.";
}

function renderShoppingItem(item) {
  const row = document.createElement("article");
  row.className = `shopping-item${item.is_marked ? " is-marked" : ""}`;
  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "shopping-check";
  check.checked = item.is_marked;
  check.disabled = item.is_marked;
  check.setAttribute("aria-label", item.is_marked ? `${item.name} added to a bill` : `Record ${item.name} to a bill`);
  check.addEventListener("change", () => openRecordModal(item));
  const copy = document.createElement("div");
  copy.className = "shopping-copy";
  const name = document.createElement("span");
  name.className = "shopping-name";
  name.textContent = item.name;
  const meta = document.createElement("span");
  meta.className = "shopping-meta";
  meta.textContent = item.is_marked ? `Added to bill${item.planned_qty ? ` · Planned: ${item.planned_qty}` : ""}` : (item.planned_qty || "Tap the check when bought");
  copy.append(name, meta);
  const actions = document.createElement("div");
  actions.className = "item-actions";
  const edit = makeIconButton("✎", `Edit ${item.name}`, () => openEditModal(item));
  const remove = makeIconButton("×", `Delete ${item.name}`, () => confirmDeleteShopping(item));
  actions.append(edit, remove);
  row.append(check, copy, actions);
  return row;
}

function makeIconButton(text, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", onClick);
  return button;
}

function billTotals(items) {
  return items.reduce((totals, item) => {
    const basisAmounts = { "per 1kg": 1000, "per 100g": 100, "per 1g": 1, "per 1l": 1000, "per 100ml": 100, "per 1ml": 1, "per item/pack": 1 };
    const basisDimension = item.unit_price_base.includes("kg") || item.unit_price_base.includes("g") ? "g" : item.unit_price_base.includes("l") ? "ml" : "each";
    const actual = unitQuantity(Number(item.actual_qty), item.qty_unit);
    const gross = actual.dimension === basisDimension
      ? Math.round(Number(item.unit_price_rate) * actual.amount / basisAmounts[item.unit_price_base] * 100) / 100
      : Number(item.final_item_price);
    totals.gross += gross;
    totals.discount += Math.max(0, gross - Number(item.final_item_price || 0));
    totals.net += Number(item.final_item_price || 0);
    return totals;
  }, { gross: 0, discount: 0, net: 0 });
}

function formatDiscount(item) {
  const applied = billTotals([item]).discount;
  return item.discount_type === "%"
    ? `${Number(item.discount_value)}% (${formatMoney(applied)})`
    : formatMoney(applied);
}

function renderBills() {
  billList.replaceChildren();
  bills.forEach((bill) => {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = `bill-choice${bill.id === selectedBillId ? " is-active" : ""}`;
    choice.setAttribute("aria-pressed", String(bill.id === selectedBillId));
    const title = document.createElement("span");
    title.className = "bill-choice-name";
    title.textContent = bill.title;
    const total = document.createElement("span");
    total.className = "bill-choice-total";
    total.textContent = formatMoney(billTotals(bill.id === selectedBillId ? billItems : bill.items || []).net);
    choice.append(title, total);
    choice.addEventListener("click", () => selectBill(bill.id));
    billList.append(choice);
  });
  billEmpty.hidden = bills.length > 0;
  $("#bill-count").textContent = String(bills.length);
  $("#open-bill-count").textContent = String(bills.filter((bill) => bill.status === "open").length);
  const selected = bills.find((bill) => bill.id === selectedBillId);
  billContent.hidden = !selected;
  billDetailEmpty.hidden = Boolean(selected);
  if (!selected) return;
  $("#bill-title").textContent = selected.title;
  $("#bill-status-label").textContent = selected.status === "open" ? "Open bill" : "Completed bill";
  $("#bill-date").textContent = `Started ${new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.created_at))}`;
  renderBillItems();
}

function renderBillItems() {
  const body = $("#bill-items-body");
  body.replaceChildren();
  billItems.forEach((item) => {
    const row = document.createElement("tr");
    const discountLabel = formatDiscount(item);
    const values = [item.item_name, `${item.actual_qty} ${item.qty_unit}`, `${formatMoney(item.unit_price_rate)} ${item.unit_price_base}`, discountLabel, formatMoney(item.final_item_price)];
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      cell.dataset.label = ["Item", "Quantity", "Rate", "Discount", "Net (LKR)"][index];
      if (index === 4) cell.className = "number-cell";
      row.append(cell);
    });
    body.append(row);
  });
  $("#bill-items-empty").hidden = billItems.length > 0;
  const totals = billTotals(billItems);
  $("#bill-gross").textContent = formatMoney(totals.gross);
  $("#bill-discounts").textContent = `− ${formatMoney(totals.discount)}`;
  $("#bill-net").textContent = formatMoney(totals.net);
}

function renderAll() {
  renderShopping();
  renderBills();
}

async function loadData() {
  if (!currentUser || !supabaseClient) return;
  showStatus("Loading your shopping and bills…", true);
  const [shoppingResult, billResult, billItemsResult] = await Promise.all([
    supabaseClient.from("shopping_items").select("id, user_id, name, planned_qty, is_marked, marked_at").eq("user_id", currentUser.id).order("created_at", { ascending: true }),
    supabaseClient.from("bills").select("id, user_id, title, status, created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
    supabaseClient.from("bill_items").select("id, bill_id, user_id, item_name, actual_qty, qty_unit, unit_price_rate, unit_price_base, discount_value, discount_type, final_item_price, created_at").eq("user_id", currentUser.id)
  ]);
  if (shoppingResult.error) throw shoppingResult.error;
  if (billResult.error) throw billResult.error;
  if (billItemsResult.error) throw billItemsResult.error;
  shoppingItems = shoppingResult.data || [];
  bills = (billResult.data || []).map((bill) => ({ ...bill, items: (billItemsResult.data || []).filter((item) => item.bill_id === bill.id) }));
  if (!bills.some((bill) => bill.id === selectedBillId)) selectedBillId = bills[0]?.id || null;
  await loadSelectedBillItems();
  renderAll();
  networkStatus.hidden = true;
  setSaveStatus("Synced to your account");
}

async function loadSelectedBillItems() {
  if (!selectedBillId) { billItems = []; return; }
  const { data, error } = await supabaseClient.from("bill_items").select("id, bill_id, user_id, item_name, actual_qty, qty_unit, unit_price_rate, unit_price_base, discount_value, discount_type, final_item_price, created_at").eq("bill_id", selectedBillId).eq("user_id", currentUser.id).order("created_at", { ascending: true });
  if (error) throw error;
  billItems = data || [];
}

async function runAction(action, successMessage = "Synced to your account") {
  setSaveStatus("Saving…");
  try {
    await action();
    await loadData();
    setSaveStatus(successMessage);
  } catch (error) {
    setSaveStatus("Sync issue");
    handleError(error);
  }
}

async function createBill(title) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Enter a name for the bill.");
  const { data, error } = await supabaseClient.from("bills").insert({ title: cleanTitle, user_id: currentUser.id }).select("id").single();
  if (error) throw error;
  selectedBillId = data.id;
  return data.id;
}

async function addShoppingItem(event) {
  event.preventDefault();
  const name = shoppingName.value.trim();
  if (!name) return;
  await runAction(async () => {
    const { error } = await supabaseClient.from("shopping_items").insert({ user_id: currentUser.id, name, planned_qty: shoppingQuantity.value.trim() || null });
    if (error) throw error;
  });
  shoppingForm.reset();
  shoppingName.focus();
}

function openEditModal(item) {
  editingShoppingItem = item;
  editName.value = item.name;
  editQty.value = item.planned_qty || "";
  $("#edit-item-error").textContent = "";
  showModal(editModal);
  editName.focus();
}

async function saveShoppingEdit(event) {
  event.preventDefault();
  if (!editingShoppingItem) return;
  const name = editName.value.trim();
  if (!name) return;
  const { error } = await supabaseClient.from("shopping_items").update({ name, planned_qty: editQty.value.trim() || null }).eq("id", editingShoppingItem.id).eq("user_id", currentUser.id);
  if (error) { $("#edit-item-error").textContent = error.message; return; }
  hideModal(editModal);
  editingShoppingItem = null;
  await refreshAfterMutation();
}

function openRecordModal(item) {
  pendingShoppingItem = item;
  $("#record-item-name").textContent = item.name;
  targetBill.replaceChildren();
  const openBills = bills.filter((bill) => bill.status === "open");
  openBills.forEach((bill) => {
    const option = document.createElement("option");
    option.value = bill.id;
    option.textContent = bill.title;
    targetBill.append(option);
  });
  const create = document.createElement("option");
  create.value = "__create__";
  create.textContent = "+ Create new bill";
  targetBill.append(create);
  targetBill.value = openBills.some((bill) => bill.id === selectedBillId) ? selectedBillId : (openBills[0]?.id || "__create__");
  modalNewBillWrap.hidden = targetBill.value !== "__create__";
  modalNewBill.value = "";
  actualQty.value = "1";
  qtyUnit.value = "unit/packet";
  unitRate.value = "";
  discountValue.value = "0";
  recordError.textContent = "";
  showModal(recordModal);
  updateSubtotal();
  (openBills.length ? actualQty : modalNewBill).focus();
}

function unitQuantity(quantity, unit) {
  if (unit === "g") return { amount: quantity, dimension: "g" };
  if (unit === "kg") return { amount: quantity * 1000, dimension: "g" };
  if (unit === "ml") return { amount: quantity, dimension: "ml" };
  if (unit === "l") return { amount: quantity * 1000, dimension: "ml" };
  if (unit === "half") return { amount: quantity * 0.5, dimension: "each" };
  if (unit === "full" || unit === "unit/packet") return { amount: quantity, dimension: "each" };
  return { amount: 0, dimension: "unknown" };
}

function calculateRecord() {
  const quantity = Number(actualQty.value);
  const rate = Number(unitRate.value);
  const discount = Math.max(0, Number(discountValue.value || 0));
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) return { gross: 0, discount: 0, net: 0, valid: false };
  const [baseAmount, baseDimension] = priceBasis.value.split(":");
  const actual = unitQuantity(quantity, qtyUnit.value);
  if (actual.dimension !== baseDimension) return { gross: 0, discount: 0, net: 0, valid: false, mismatch: true };
  const gross = rate * actual.amount / Number(baseAmount);
  const discountType = recordForm.querySelector('[name="discount-type"]:checked').value;
  const requestedDiscount = discountType === "%" ? gross * Math.min(discount, 100) / 100 : discount;
  const appliedDiscount = Math.min(gross, requestedDiscount);
  return { gross, discount: appliedDiscount, net: Math.max(0, gross - appliedDiscount), valid: true, discountType };
}

function updateSubtotal() {
  const total = calculateRecord();
  subtotalPreview.textContent = formatMoney(total.net);
  const unitMatches = !total.mismatch;
  unitRate.setCustomValidity(unitMatches ? "" : "Quantity and price basis must use compatible units.");
  recordError.textContent = total.mismatch ? "Choose a price basis that matches the quantity unit." : "";
  $("#record-save").disabled = !total.valid;
}

async function saveRecord(event) {
  event.preventDefault();
  if (!pendingShoppingItem) return;
  const calculation = calculateRecord();
  if (!calculation.valid) { updateSubtotal(); return; }
  const billIdChoice = targetBill.value;
  const openBills = bills.filter((bill) => bill.status === "open");
  if (billIdChoice === "__create__" && !modalNewBill.value.trim()) {
    recordError.textContent = "Name the new bill before saving.";
    modalNewBill.focus();
    return;
  }
  const item = pendingShoppingItem;
  const baseLabels = { "1000:g":"per 1kg", "100:g":"per 100g", "1:g":"per 1g", "1000:ml":"per 1l", "100:ml":"per 100ml", "1:ml":"per 1ml", "1:each":"per item/pack" };
  const basis = priceBasis.value;
  const quantity = Number(actualQty.value);
  const rate = Number(unitRate.value);
  const discountType = calculation.discountType;
  const discountStored = discountType === "%" ? Math.min(100, Number(discountValue.value || 0)) : calculation.discount;
  $("#record-save").disabled = true;
  recordError.textContent = "";
  try {
    let billId = billIdChoice;
    if (billId === "__create__") billId = await createBill(modalNewBill.value);
    else if (!openBills.some((bill) => bill.id === billId)) throw new Error("Choose an open bill or create a new one.");
    const { error: insertError } = await supabaseClient.from("bill_items").insert({
      bill_id: billId, user_id: currentUser.id, item_name: item.name, actual_qty: quantity, qty_unit: qtyUnit.value,
      unit_price_rate: rate, unit_price_base: baseLabels[basis], discount_value: discountStored, discount_type: discountType,
      final_item_price: Number(calculation.net.toFixed(2))
    });
    if (insertError) throw insertError;
    const { error: markError } = await supabaseClient.from("shopping_items").update({ is_marked: true, marked_at: new Date().toISOString() }).eq("id", item.id).eq("user_id", currentUser.id);
    if (markError) throw new Error(`Bill line saved, but the shopping item could not be marked: ${markError.message}`);
    closeRecordModal();
    await loadData();
  } catch (error) {
    recordError.textContent = error.message || "Could not add the item to the bill.";
    $("#record-save").disabled = false;
    handleError(error);
    await loadData().catch((loadError) => console.error(loadError));
  }
}

function showConfirm(message, action) {
  confirmMessage.textContent = message;
  confirmAction = action;
  showModal(confirmModal);
}

function closeConfirm() {
  hideModal(confirmModal);
  confirmAction = null;
}

function confirmDeleteShopping(item) {
  showConfirm(`Delete “${item.name}” from your shopping list?`, async () => {
    const { error } = await supabaseClient.from("shopping_items").delete().eq("id", item.id).eq("user_id", currentUser.id);
    if (error) throw error;
  });
}

async function selectBill(id) {
  selectedBillId = id;
  try { await loadSelectedBillItems(); renderBills(); }
  catch (error) { handleError(error, "Could not load this bill."); }
}

async function createBillFromForm(event) {
  event.preventDefault();
  const title = newBillTitle.value.trim();
  if (!title) return;
  await runAction(async () => { await createBill(title); });
  newBillTitle.value = "";
  setView("billing");
}

async function renameBill() {
  const bill = bills.find((entry) => entry.id === selectedBillId);
  if (!bill) return;
  const title = window.prompt("Rename bill", bill.title);
  if (title === null || !title.trim()) return;
  await runAction(async () => {
    const { error } = await supabaseClient.from("bills").update({ title: title.trim() }).eq("id", bill.id).eq("user_id", currentUser.id);
    if (error) throw error;
  });
}

async function requestBillDelete() {
  const bill = bills.find((entry) => entry.id === selectedBillId);
  if (!bill) return;
  showConfirm(`Delete “${bill.title}” and all its bill items? This cannot be undone.`, async () => {
    const { error } = await supabaseClient.from("bills").delete().eq("id", bill.id).eq("user_id", currentUser.id);
    if (error) throw error;
    selectedBillId = null;
  });
}

async function refreshAfterMutation() {
  closeConfirm();
  await loadData();
}

async function runConfirmAction() {
  if (!confirmAction) return;
  const action = confirmAction;
  try { await action(); await refreshAfterMutation(); }
  catch (error) { closeConfirm(); handleError(error); }
}

function setView(view) {
  currentView = view;
  viewButtons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".app-view").forEach((panel) => {
    const active = panel.dataset.panel === view;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

function updateAuthMode() {
  const isSignIn = authMode === "signin";
  authKicker.textContent = isSignIn ? "Welcome back" : "Join SmartCart";
  authTitle.textContent = isSignIn ? "Ready when you are." : "Shop with a clear total.";
  authCopy.textContent = isSignIn ? "Sign in to manage your list and live bills." : "Create an account to keep your shopping and bills in sync.";
  authSubmit.textContent = isSignIn ? "Sign in" : "Create account";
  authToggle.textContent = isSignIn ? "Need an account? Sign up" : "Already have an account? Sign in";
  authPassword.autocomplete = isSignIn ? "current-password" : "new-password";
}

function authError(error) { return error?.message || "Authentication failed. Check your details and try again."; }

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  authFeedback.classList.remove("is-error", "is-success");
  if (!email || password.length < 6) { authFeedback.textContent = "Enter a valid email and a password of at least 6 characters."; authFeedback.classList.add("is-error"); return; }
  if (!supabaseClient) { authFeedback.textContent = "Cloud service unavailable. Check your connection and reload."; authFeedback.classList.add("is-error"); return; }
  authSubmit.disabled = true;
  authFeedback.textContent = authMode === "signin" ? "Signing in…" : "Creating your account…";
  try {
    if (authMode === "signin") {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) await handleAuthState(data.session);
    } else {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) await handleAuthState(data.session);
      else { authFeedback.textContent = "Account created. Check your email to verify it, then sign in."; authFeedback.classList.add("is-success"); }
    }
  } catch (error) { authFeedback.textContent = authError(error); authFeedback.classList.add("is-error"); }
  finally { authSubmit.disabled = false; }
}

async function handleAuthState(session) {
  setAuthenticatedView(session?.user || null);
  if (!session?.user) return;
  try { await loadData(); }
  catch (error) { handleError(error, "Could not load your account data. Run the supplied Supabase SQL setup."); }
}

function exportBillPdf() {
  const bill = bills.find((entry) => entry.id === selectedBillId);
  if (!bill || !window.jspdf?.jsPDF) { showStatus("PDF export library is unavailable. Reload and try again."); return; }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const totals = billTotals(billItems);
  const createdAt = new Intl.DateTimeFormat("en-LK", { dateStyle: "full", timeStyle: "short" }).format(new Date(bill.created_at));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SmartCart & Bill", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Bill: ${bill.title}`, 14, 27);
  doc.text(`Date: ${createdAt}`, 14, 33);
  doc.autoTable({ startY: 41, head: [["Item", "Qty", "Rate / basis", "Discount", "Net (LKR)"]], body: billItems.map((item) => [item.item_name, `${item.actual_qty} ${item.qty_unit}`, `${formatMoney(item.unit_price_rate)} ${item.unit_price_base}`, formatDiscount(item), formatMoney(item.final_item_price)]), styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [27, 89, 73] }, columnStyles: { 4: { halign: "right" } } });
  const summaryY = (doc.lastAutoTable?.finalY || 41) + 10;
  doc.setFontSize(10);
  doc.text(`Gross amount: ${formatMoney(totals.gross)}`, 196, summaryY, { align: "right" });
  doc.text(`Total discounts: ${formatMoney(totals.discount)}`, 196, summaryY + 7, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Grand total: ${formatMoney(totals.net)}`, 196, summaryY + 17, { align: "right" });
  doc.save(`${bill.title.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "bill"}.pdf`);
}

function bindEvents() {
  authForm.addEventListener("submit", handleAuthSubmit);
  authToggle.addEventListener("click", () => { authMode = authMode === "signin" ? "signup" : "signin"; updateAuthMode(); });
  $("#logout-button").addEventListener("click", async () => { const { error } = await supabaseClient.auth.signOut(); if (error) handleError(error); });
  shoppingForm.addEventListener("submit", addShoppingItem);
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((entry) => entry.classList.toggle("is-active", entry === button));
    renderShopping();
  }));
  viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  billCreateForm.addEventListener("submit", createBillFromForm);
  $("#record-close").addEventListener("click", closeRecordModal);
  $("#record-cancel").addEventListener("click", closeRecordModal);
  recordModal.addEventListener("click", (event) => { if (event.target === recordModal) closeRecordModal(); });
  targetBill.addEventListener("change", () => { modalNewBillWrap.hidden = targetBill.value !== "__create__"; if (!modalNewBillWrap.hidden) modalNewBill.focus(); });
  recordForm.addEventListener("input", updateSubtotal);
  recordForm.addEventListener("change", updateSubtotal);
  recordForm.addEventListener("submit", saveRecord);
  editForm.addEventListener("submit", saveShoppingEdit);
  $("#edit-item-close").addEventListener("click", () => hideModal(editModal));
  $("#edit-item-cancel").addEventListener("click", () => hideModal(editModal));
  editModal.addEventListener("click", (event) => { if (event.target === editModal) hideModal(editModal); });
  $("#rename-bill-button").addEventListener("click", renameBill);
  $("#delete-bill-button").addEventListener("click", requestBillDelete);
  $("#download-pdf").addEventListener("click", exportBillPdf);
  $("#confirm-close").addEventListener("click", closeConfirm);
  $("#confirm-cancel").addEventListener("click", closeConfirm);
  $("#confirm-delete").addEventListener("click", runConfirmAction);
  confirmModal.addEventListener("click", (event) => { if (event.target === confirmModal) closeConfirm(); });
  $("#status-dismiss").addEventListener("click", () => { networkStatus.hidden = true; });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!recordModal.hidden) closeRecordModal();
    else if (!editModal.hidden) hideModal(editModal);
    else if (!confirmModal.hidden) closeConfirm();
  });
}

$("#footer-date").textContent = new Intl.DateTimeFormat("en-LK", { dateStyle: "medium" }).format(new Date());
updateAuthMode();
bindEvents();
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)) handleAuthState(session);
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    return handleAuthState(data.session);
  }).catch((error) => { authFeedback.textContent = authError(error); authFeedback.classList.add("is-error"); });
} else {
  authFeedback.textContent = "Cloud service unavailable. Check your connection and reload.";
  authFeedback.classList.add("is-error");
}