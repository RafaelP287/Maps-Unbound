import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authData = localStorage.getItem("maps-unbound-auth");
    if (authData) {
      try {
        const { user, token } = JSON.parse(authData);
        setUser(user);
        setToken(token);
      } catch {
        localStorage.removeItem("maps-unbound-auth");
      }
    }
    setLoading(false);
  }, []);

  const login = (authResponse) => {
    setUser(authResponse.user);
    setToken(authResponse.token);

    localStorage.setItem(
      "maps-unbound-auth",
      JSON.stringify(authResponse)
    );
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("maps-unbound-auth");
  };

  const isLoggedIn = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, isLoggedIn, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);