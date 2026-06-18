import React, { useState, useEffect } from "react";
import { NurseryUser } from "../types";
import { Sprout, UserPlus, Trash2, KeyRound, ArrowLeft, ArrowRight, UserCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fetchCollection, saveItem, removeItem } from "../lib/firebase";

interface SignInViewProps {
  onSignInSuccess: (user: NurseryUser) => void;
}

const DEFAULT_USERS: NurseryUser[] = [
  { id: "u-1", username: "Sri Rama Satya", role: "Stalwart", pin: "2004", avatarColor: "#5A5A40" },
  { id: "u-2", username: "Surendra Bonam", role: "Head - Manager", pin: "1977", avatarColor: "#3D2B1F" },
  { id: "u-3", username: "Gangadhar Bonam", role: "Manager", pin: "1234", avatarColor: "#4A5D4E" },
  { id: "u-4", username: "Shivaji Bonam", role: "Assistant Manager", pin: "1111", avatarColor: "#A3B18A" },
];

export default function SignInView({ onSignInSuccess }: SignInViewProps) {
  const [users, setUsers] = useState<NurseryUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<NurseryUser | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Create user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState("Sales Staff");
  const [newPin, setNewPin] = useState("");
  const [newAvatarColor, setNewAvatarColor] = useState("#5A5A40");
  
  // Custom profile deletion confirmation state
  const [profileToDelete, setProfileToDelete] = useState<NurseryUser | null>(null);

  const avatarColors = [
    "#5A5A40", // Brand editorial-primary
    "#3D2B1F", // Brand editorial-dark
    "#A3B18A", // Brand editorial-accent
    "#4A5D4E", // Deep forest green
    "#7D6B58", // Warm taupe
    "#B08968", // Earth clay
  ];

  // Load users from localStorage or set defaults
  useEffect(() => {
    const initUsers = async () => {
      try {
        const dbUsers = await fetchCollection<NurseryUser>("users");
        if (dbUsers && dbUsers.length > 0) {
          let updated = dbUsers;
          let needsUpdate = false;
          updated = updated.map(u => {
            if (u.username === "Surendra Bonam" && u.role !== "Head - Manager") {
              needsUpdate = true;
              const uCopy = { ...u, role: "Head - Manager" };
              saveItem("users", u.id, uCopy).catch(console.error);
              return uCopy;
            }
            return u;
          });

          setUsers(updated);
          localStorage.setItem("devakusuma_users", JSON.stringify(updated));
          return;
        }
      } catch (err) {
        console.warn("Could not fetch users from Firestore, falling back to local storage:", err);
      }

      const localUsers = localStorage.getItem("devakusuma_users");
      if (localUsers) {
        try {
          const parsed = JSON.parse(localUsers) as NurseryUser[];
          const hasOldFormat = parsed.some(u => u.username === "Bonam Surendra" || u.username === "Annapoorna");
          const hasNewRepresentative = parsed.some(u => u.username === "Surendra Bonam") && parsed.some(u => u.username === "Sri Rama Satya");
          if (hasOldFormat || !hasNewRepresentative) {
            setUsers(DEFAULT_USERS);
            localStorage.setItem("devakusuma_users", JSON.stringify(DEFAULT_USERS));
            for (const u of DEFAULT_USERS) {
              saveItem("users", u.id, u).catch(console.error);
            }
          } else {
            let updated = parsed;
            let needsSave = false;
            updated = updated.map(u => {
              if (u.username === "Surendra Bonam" && u.role !== "Head - Manager") {
                needsSave = true;
                return { ...u, role: "Head - Manager" };
              }
              return u;
            });

            setUsers(updated);
            localStorage.setItem("devakusuma_users", JSON.stringify(updated));
            for (const u of updated) {
              saveItem("users", u.id, u).catch(console.error);
            }
          }
        } catch (e) {
          setUsers(DEFAULT_USERS);
          localStorage.setItem("devakusuma_users", JSON.stringify(DEFAULT_USERS));
        }
      } else {
        setUsers(DEFAULT_USERS);
        localStorage.setItem("devakusuma_users", JSON.stringify(DEFAULT_USERS));
        for (const u of DEFAULT_USERS) {
          saveItem("users", u.id, u).catch(console.error);
        }
      }
    };

    initUsers();
  }, []);

  const handleSelectUser = (user: NurseryUser) => {
    setSelectedUser(user);
    setPinInput("");
    setErrorMessage("");
  };

  const handleBackToProfiles = () => {
    setSelectedUser(null);
    setPinInput("");
    setErrorMessage("");
  };

  const handlePinKeyPress = (num: string) => {
    setErrorMessage("");
    if (pinInput.length < 8) {
      setPinInput(pinInput + num);
    }
  };

  const handleBackspace = () => {
    setErrorMessage("");
    setPinInput(pinInput.slice(0, -1));
  };

  const handleClearPin = () => {
    setErrorMessage("");
    setPinInput("");
  };

  // Keyboard support for PIN entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedUser) return;
      
      if (e.key >= "0" && e.key <= "9") {
        handlePinKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter") {
        handleSubmitPin();
      } else if (e.key === "Escape") {
        handleBackToProfiles();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pinInput, selectedUser]);

  const handleSubmitPin = () => {
    if (!selectedUser) return;
    
    if (pinInput === selectedUser.pin) {
      onSignInSuccess(selectedUser);
    } else {
      setErrorMessage("Incorrect PIN. Please try again.");
      setPinInput("");
    }
  };

  // Handle adding a new user profile (max 10 total)
  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    if (users.length >= 10) {
      alert("Employee profile limit of 10 reached. Please remove an unused profile before creating a new one.");
      return;
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      alert("PIN must be only numeric numbers, between 4 to 8 digits long.");
      return;
    }

    const newUser: NurseryUser = {
      id: `u-${Date.now()}`,
      username: newUsername.trim(),
      role: newRole,
      pin: newPin,
      avatarColor: newAvatarColor,
    };

    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem("devakusuma_users", JSON.stringify(updated));
    saveItem("users", newUser.id, newUser).catch((err) => console.error("Firestore user save error:", err));

    // Reset Form
    setNewUsername("");
    setNewRole("Sales Staff");
    setNewPin("");
    setShowAddForm(false);
  };

  const handleDeleteProfileClick = (user: NurseryUser, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent logging in when clicking delete
    
    if (users.length <= 1) {
      alert("You must have at least one operator profile active.");
      return;
    }

    setProfileToDelete(user);
  };

  const confirmDeleteProfile = () => {
    if (!profileToDelete) return;
    const updated = users.filter((u) => u.id !== profileToDelete.id);
    setUsers(updated);
    localStorage.setItem("devakusuma_users", JSON.stringify(updated));
    removeItem("users", profileToDelete.id).catch((err) => console.error("Firestore user delete error:", err));
    setProfileToDelete(null);
  };

  return (
    <div className="min-h-screen bg-editorial-bg flex flex-col justify-between p-6 md:p-10 font-sans selection:bg-editorial-accent/30 selection:text-editorial-dark">
      {/* Editorial Decorative Background Details */}
      <div className="absolute top-0 left-0 w-full h-[6px] bg-editorial-primary" />
      
      {/* Top Brand Header */}
      <header className="max-w-md w-full mx-auto text-center pt-8 md:pt-12">
        <img src="/logo.svg" alt="Devakusuma Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
        <h1 className="text-3xl md:text-4xl font-serif italic text-editorial-dark font-bold tracking-tight">
          Devakusuma Nursery
        </h1>
        <p className="text-[10px] md:text-xs font-sans font-bold uppercase tracking-[0.25em] text-editorial-primary/70 mt-1">
          Botanical Stock & Invoice Ledger
        </p>
      </header>

      {/* Main Container Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto flex items-center justify-center my-8">
        <AnimatePresence mode="wait">
          {!selectedUser ? (
            <motion.div
              key="profile-selection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-2xl bg-white border border-editorial-primary/10 rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-editorial-primary/10 pb-6 mb-8">
                <div>
                  <h2 className="text-xl font-serif text-editorial-dark font-bold">
                    Select Farm Operator
                  </h2>
                  <p className="text-xs text-editorial-primary/75 font-serif italic mt-0.5">
                    Click your profile card and enter your PIN to access the gardens ledger.
                  </p>
                </div>
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 self-start md:self-auto px-4 py-2.5 rounded-full border border-editorial-primary/20 hover:border-editorial-primary/40 bg-editorial-bg text-[10px] uppercase tracking-wider font-bold text-editorial-primary hover:text-editorial-dark transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    New operator
                  </button>
                )}
              </div>

              {/* Add User Profile Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleCreateProfile}
                    className="overflow-hidden bg-editorial-bg/50 border border-editorial-primary/10 rounded-2xl p-5 mb-8 space-y-4"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-editorial-primary/5">
                      <span className="text-[11px] font-sans uppercase font-bold tracking-widest text-editorial-dark">
                        Create Operator Profile
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="text-[10px] uppercase font-sans font-bold tracking-wider text-stone-500 hover:text-stone-850 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Name</label>
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="e.g., Kavin"
                          maxLength={15}
                          className="w-full text-xs font-serif bg-white border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark focus:outline-none focus:border-editorial-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Designation / Role</label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="w-full text-xs font-sans bg-white border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark focus:outline-none"
                        >
                          <option value="Owner">Owner</option>
                          <option value="Manager">Manager</option>
                          <option value="Sales Staff">Sales Staff</option>
                          <option value="Operator">Operator</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">PIN (numbers only)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                          maxLength={8}
                          placeholder="e.g., 2026"
                          value={newPin}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d+$/.test(val)) {
                              setNewPin(val);
                            }
                          }}
                          className="w-full text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark focus:outline-none focus:border-editorial-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80 block">Profile Stamp</label>
                        <div className="flex gap-2.5 items-center mt-1">
                          {avatarColors.map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setNewAvatarColor(col)}
                              className={`w-6 h-6 rounded-full border transition-all relative ${
                                newAvatarColor === col ? "border-editorial-dark scale-110 shadow-xs" : "border-transparent opacity-80"
                              }`}
                              style={{ backgroundColor: col }}
                            >
                              {newAvatarColor === col && (
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-editorial-primary hover:bg-editorial-dark text-white font-bold text-[10px] font-sans uppercase tracking-widest py-3 rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Save Profile Card
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Profiles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {users.map((u) => {
                  const initials = u.username.slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="group flex items-center gap-4 bg-editorial-bg hover:bg-white border-2 border-editorial-primary/5 hover:border-editorial-primary/30 p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] scale-[0.99] hover:scale-100 flex-1 relative"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold font-sans text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 pr-8">
                        <h3 className="text-sm font-serif font-bold text-editorial-dark leading-tight truncate group-hover:text-editorial-primary">
                          {u.username}
                        </h3>
                        <p className="text-[10px] font-sans uppercase tracking-wider text-editorial-primary/65 font-semibold mt-0.5">
                          {u.role}
                        </p>
                      </div>

                      {/* Delete icon for custom added cards Only (don't force Annapoorna to be locked, but keep lists reliable) */}
                      {users.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProfileClick(u, e)}
                          title="Delete Profile Stamp"
                          className="absolute right-3.5 bottom-3.5 opacity-0 group-hover:opacity-100 p-1.5 rounded bg-red-100/50 hover:bg-red-150 text-red-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer instruction */}
              <div className="text-center text-[10px] text-editorial-primary/60 font-sans tracking-widest uppercase mt-12 border-t border-editorial-primary/5 pt-6">
                Protected Local Ledger Console &bull; Max 10 Operators
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pin-authenticator"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm bg-white border border-editorial-primary/10 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
            >
              {/* Back Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  type="button"
                  onClick={handleBackToProfiles}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase font-sans font-bold tracking-wider text-editorial-primary hover:text-editorial-dark cursor-pointer transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Profiles
                </button>
                <span className="text-[9px] uppercase font-sans tracking-widest font-bold text-editorial-primary/40 bg-editorial-bg px-2 py-1 rounded">
                  Operator Login
                </span>
              </div>

              {/* Core User Identity header inside PIN Authenticator */}
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold font-sans text-xl shadow-xs mx-auto mb-3"
                  style={{ backgroundColor: selectedUser.avatarColor }}
                >
                  {selectedUser.username.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-serif font-bold text-editorial-dark">
                  Welcome back, {selectedUser.username}
                </h3>
                <p className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/70 font-semibold">
                  {selectedUser.role}
                </p>
              </div>

              {/* Masked PIN Dot Fields */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center gap-3">
                  {Array.from({ length: Math.max(4, selectedUser.pin.length) }).map((_, idx) => {
                    const isFilled = idx < pinInput.length;
                    return (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                          isFilled
                            ? "bg-editorial-primary border-editorial-primary scale-110"
                            : "bg-stone-50 border-stone-300"
                        }`}
                      />
                    );
                  })}
                </div>
                {errorMessage ? (
                  <p className="text-[11px] text-red-600 font-sans text-center font-semibold mt-1">
                    {errorMessage}
                  </p>
                ) : (
                  <p className="text-[10px] font-serif italic text-stone-500 text-center">
                    Type your numeric passcode (e.g., Stalwart: 2004, Owner: 1977, Manager: 1234, Assistant: 1111)
                  </p>
                )}
              </div>

              {/* Interactive Keypad for Click / Touch usage */}
              <div className="grid grid-cols-3 gap-3 mb-6" id="numpad-grid">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinKeyPress(num)}
                    className="h-14 font-mono text-base font-bold text-editorial-dark bg-editorial-bg hover:bg-editorial-accent/15 border border-editorial-primary/5 hover:border-editorial-primary/20 rounded-xl transition cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="h-14 text-[10px] uppercase font-sans font-bold tracking-widest text-editorial-primary bg-editorial-bg hover:bg-stone-100 border border-editorial-primary/5 rounded-xl transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKeyPress("0")}
                  className="h-14 font-mono text-base font-bold text-editorial-dark bg-editorial-bg hover:bg-editorial-accent/15 border border-editorial-primary/5 rounded-xl transition cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-14 text-[10px] uppercase font-sans font-bold tracking-widest text-editorial-primary bg-editorial-bg hover:bg-stone-100 border border-editorial-primary/5 rounded-xl transition cursor-pointer flex items-center justify-center"
                >
                  Back
                </button>
              </div>

              {/* Login Action Button */}
              <button
                type="button"
                onClick={handleSubmitPin}
                disabled={pinInput.length < 4}
                className={`w-full py-3.5 rounded-full font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  pinInput.length < 4
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300/30"
                    : "bg-editorial-primary hover:bg-editorial-dark text-white"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Unlock Ledger
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Profile Deletion Custom Modal */}
      <AnimatePresence>
        {profileToDelete && (
          <div key="delete-profile-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-dark/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white border border-editorial-primary/15 rounded-3xl p-6 shadow-xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold text-editorial-dark">
                Delete Operator Profile
              </h3>
              <p className="text-xs text-stone-500 font-serif italic mt-1.5">
                Are you sure you want to delete the operator profile for <span className="font-sans font-bold text-editorial-dark not-italic">{profileToDelete.username} ({profileToDelete.role})</span>?
              </p>
              <p className="text-[10px] text-red-700 font-sans font-bold uppercase tracking-wider mt-3">
                This operator won't be able to log in.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setProfileToDelete(null)}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProfile}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-xs"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant minimalist bottom bar */}
      <footer className="text-center font-sans text-[9px] uppercase tracking-[0.3em] text-editorial-primary/50 py-4 mt-8">
        Devakusuma Gardens Farm OS v2.1 &bull; Locally Encrypted Passcodes
      </footer>
    </div>
  );
}
