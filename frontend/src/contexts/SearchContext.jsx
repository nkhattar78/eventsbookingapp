import React, { createContext, useContext, useState } from "react";

const SearchContext = createContext();

export function useSearch() {
  return useContext(SearchContext);
}

export function SearchProvider({ children }) {
  const [search, setSearch] = useState("");
  const [searchHandler, setSearchHandler] = useState(null);

  const registerSearchHandler = (handler) => {
    setSearchHandler(() => handler);
  };

  const clearSearch = () => {
    setSearch("");
  };

  return (
    <SearchContext.Provider
      value={{
        search,
        setSearch,
        searchHandler,
        registerSearchHandler,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}
