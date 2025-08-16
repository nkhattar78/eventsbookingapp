import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Optionally, decode token to get user info
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setAuth({
          isAuthenticated: true,
          user: { id: payload.user_id, role: payload.role, name: payload.name },
          token,
        });
      } catch {
        setAuth({ isAuthenticated: false, user: null, token: null });
      }
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setAuth({
        isAuthenticated: true,
        user: { id: payload.user_id, role: payload.role, name: payload.name },
        token,
      });
    } catch {
      setAuth({ isAuthenticated: false, user: null, token: null });
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuth({ isAuthenticated: false, user: null, token: null });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
