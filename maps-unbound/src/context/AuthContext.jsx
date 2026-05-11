import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

const normalizeUser = (user) => {
  if (!user) return null;
  const id = user.id || user._id || "";
  return {
    ...user,
    id,
    _id: user._id || id,
  };
};

const normalizeAuthResponse = (authResponse) => ({
  ...authResponse,
  user: normalizeUser(authResponse?.user),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authData = localStorage.getItem("maps-unbound-auth");
    if (authData) {
      try {
        const parsed = normalizeAuthResponse(JSON.parse(authData));
        setUser(parsed.user);
        setToken(parsed.token);
        localStorage.setItem("maps-unbound-auth", JSON.stringify(parsed));
      } catch {
        localStorage.removeItem("maps-unbound-auth");
      }
    }
    setLoading(false);
  }, []);

  const login = (authResponse) => {
    const normalizedAuth = normalizeAuthResponse(authResponse);
    setUser(normalizedAuth.user);
    setToken(normalizedAuth.token);

    localStorage.setItem(
      "maps-unbound-auth",
      JSON.stringify(normalizedAuth)
    );
  };

  const updateUser = (nextUser) => {
    const normalizedUser = normalizeUser(nextUser);
    setUser(normalizedUser);

    const authData = localStorage.getItem("maps-unbound-auth");
    if (!authData) return;

    try {
      const parsed = JSON.parse(authData);
      localStorage.setItem(
        "maps-unbound-auth",
        JSON.stringify({ ...parsed, user: normalizedUser })
      );
    } catch {
      localStorage.removeItem("maps-unbound-auth");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("maps-unbound-auth");
  };

  const isLoggedIn = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, isLoggedIn, login, logout, updateUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
