import { Button, TextInput } from "flowbite-react";
import React, { useEffect } from "react";
import { AiOutlineSearch } from "react-icons/ai";
import { customThemeTi } from "../utils/flowbiteCustomThemes";

type SearchBarProps = {
  onSearch: (searchTerm: string) => void;
};

function SearchBar({ onSearch }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    onSearch(term);
  };

  return (
    <div className="max-w-max">
      <TextInput
          type="text"
          placeholder="Search by title, description, or creator..."
          rightIcon={AiOutlineSearch}
          className="w-full p-2.5"
          theme={customThemeTi}
          color="gray"
          value={searchTerm}
          onChange={handleSearchChange}
        />

    </div>
  );
}

export default SearchBar;
