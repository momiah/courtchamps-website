import React, { memo, useMemo, useState } from "react";
import styled from "styled-components";

export interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

function MultiSelect({
  options,
  selectedIds,
  onToggle,
  onRemove,
  searchPlaceholder,
  footer,
}: {
  options: MultiSelectOption[];
  selectedIds: string[];
  onToggle: (optionId: string) => void;
  onRemove: (optionId: string) => void;
  searchPlaceholder?: string;
  footer?: React.ReactNode;
}) {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const selectedOptions = useMemo(
    () =>
      selectedIds
        .map((selectedId) =>
          options.find((option) => option.id === selectedId),
        )
        .filter((option): option is MultiSelectOption => option !== undefined),
    [selectedIds, options],
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch.length === 0) {
      return options;
    }
    return options.filter((option) => {
      const haystack = `${option.label} ${option.sublabel ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [options, searchTerm]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <Container>
      {selectedOptions.length > 0 ? (
        <ChipRow>
          {selectedOptions.map((option) => (
            <Chip key={option.id}>
              <ChipLabel>
                {option.label}
                {option.sublabel ? (
                  <ChipSublabel> · {option.sublabel}</ChipSublabel>
                ) : null}
              </ChipLabel>
              <ChipRemove
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={() => onRemove(option.id)}
              >
                ×
              </ChipRemove>
            </Chip>
          ))}
        </ChipRow>
      ) : null}

      <SearchInput
        type="text"
        value={searchTerm}
        placeholder={searchPlaceholder ?? "Search…"}
        onChange={(changeEvent) => setSearchTerm(changeEvent.target.value)}
      />

      <OptionList>
        {filteredOptions.length === 0 ? (
          <NoResults>No matches</NoResults>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = selectedIdSet.has(option.id);
            return (
              <OptionRow key={option.id} htmlFor={`multiselect-${option.id}`}>
                <OptionCheckbox
                  id={`multiselect-${option.id}`}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(option.id)}
                />
                <OptionText>
                  <OptionLabel>{option.label}</OptionLabel>
                  {option.sublabel ? (
                    <OptionSublabel>{option.sublabel}</OptionSublabel>
                  ) : null}
                </OptionText>
              </OptionRow>
            );
          })
        )}
      </OptionList>

      {footer ? <Footer>{footer}</Footer> : null}
    </Container>
  );
}

export default memo(MultiSelect);

const Container = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "100%",
});

const ChipRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
});

const Chip = styled.span({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "5px 6px 5px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(0, 153, 240, 0.16)",
  border: "1px solid rgba(0, 153, 240, 0.55)",
  color: "#e4ecf3",
  fontSize: "0.8rem",
});

const ChipLabel = styled.span({
  fontWeight: 600,
});

const ChipSublabel = styled.span({
  color: "#8fa3b8",
  fontWeight: 400,
});

const ChipRemove = styled.button({
  border: "none",
  background: "none",
  color: "#8fa3b8",
  fontSize: "1.1rem",
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  ":hover": {
    color: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
});

const SearchInput = styled.input({
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  backgroundColor: "#07111f",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  outline: "none",
  ":focus": {
    borderColor: "#0099f0",
  },
});

const OptionList = styled.div({
  display: "flex",
  flexDirection: "column",
  maxHeight: "220px",
  overflowY: "auto",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  backgroundColor: "#07111f",
});

const OptionRow = styled.label({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
  cursor: "pointer",
  ":not(:last-child)": {
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
});

const OptionCheckbox = styled.input({
  width: "16px",
  height: "16px",
  accentColor: "#0099f0",
  cursor: "pointer",
});

const OptionText = styled.span({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

const OptionLabel = styled.span({
  color: "#e4ecf3",
  fontSize: "0.88rem",
  fontWeight: 600,
});

const OptionSublabel = styled.span({
  color: "#8fa3b8",
  fontSize: "0.78rem",
});

const NoResults = styled.div({
  padding: "16px 12px",
  color: "#8fa3b8",
  fontSize: "0.85rem",
  textAlign: "center",
});

const Footer = styled.div({
  display: "flex",
});
