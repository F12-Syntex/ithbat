import { useState, type FormEvent } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";

import { SearchIcon } from "@/components/icons";

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form className="w-full max-w-2xl" onSubmit={handleSubmit}>
      <Input
        classNames={{
          input: "text-base",
          inputWrapper: "h-14 shadow-md",
        }}
        endContent={
          <Button
            isIconOnly
            color="primary"
            isDisabled={!query.trim() || isLoading}
            isLoading={isLoading}
            type="submit"
            variant="flat"
          >
            <SearchIcon className="text-lg" />
          </Button>
        }
        isDisabled={isLoading}
        placeholder="Ask about Islamic rulings, hadith, or Quranic verses..."
        radius="lg"
        size="lg"
        value={query}
        onValueChange={setQuery}
      />
    </form>
  );
}
