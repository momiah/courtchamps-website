import React from "react";
import styled from "styled-components";
import {
  FaUser,
  FaTrophy,
  FaMapMarkerAlt,
  FaLock,
  FaUnlock,
  FaMedal,
  FaCalendar,
  FaClock,
} from "react-icons/fa";

const ICONS: Record<string, React.ReactElement> = {
  person: <FaUser />,
  trophy: <FaTrophy />,
  location: <FaMapMarkerAlt />,
  lock: <FaLock />,
  unlock: <FaUnlock />,
  medal: <FaMedal />,
  calendar: <FaCalendar />,
  clock: <FaClock />,
};

interface TagProps {
  name?: string;
  color?: string;
  icon?: string;
  iconColor?: string;
  onPress?: () => void;
  iconSize?: number;
  bold?: boolean;
  iconPosition?: "left" | "right";
  width?: number | string;
  fontSize?: number;
  disabled?: boolean;
  loading?: boolean;
}

const Tag = ({
  name,
  color = "#2F2F30",
  icon,
  iconColor = "white",
  onPress,
  iconSize = 12,
  bold,
  iconPosition = "right",
  width,
  fontSize = 10,
  disabled = false,
  loading = false,
}: TagProps) => {
  const tagName = name ? name.toUpperCase() : "";
  const flexDirection = iconPosition === "left" ? "row" : "row-reverse";
  const resolvedIcon = icon ? ICONS[icon] : null;

  return (
    <TagContainer
      as={onPress ? "button" : "div"}
      backgroundColor={color}
      flexDirection={flexDirection}
      width={width}
      disabled={disabled}
      onClick={disabled ? undefined : onPress}
      style={{ cursor: onPress && !disabled ? "pointer" : "default" }}
    >
      {loading ? (
        <Spinner />
      ) : (
        resolvedIcon && (
          <IconWrapper
            flexDirection={flexDirection}
            iconColor={iconColor}
            iconSize={iconSize}
          >
            {resolvedIcon}
          </IconWrapper>
        )
      )}
      <TagText bold={bold} fontSize={fontSize}>
        {tagName}
      </TagText>
    </TagContainer>
  );
};

const TagContainer = styled.div<{
  backgroundColor: string;
  flexDirection: string;
  width?: number | string;
  disabled?: boolean;
}>(({ backgroundColor, flexDirection, width, disabled }) => ({
  display: "inline-flex",
  flexDirection: flexDirection as any,
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px",
  borderRadius: "6px",
  width: width ?? undefined,
  backgroundColor,
  opacity: disabled ? 0.5 : 1,
  border: "none",
  outline: "none",
}));

const IconWrapper = styled.span<{
  flexDirection: string;
  iconColor: string;
  iconSize: number;
}>(({ flexDirection, iconColor, iconSize }) => ({
  paddingLeft: flexDirection === "row-reverse" ? 5 : 0,
  paddingRight: flexDirection === "row" ? 5 : 0,
  display: "flex",
  alignItems: "center",
  color: iconColor,
  fontSize: iconSize,
}));

const TagText = styled.span<{ bold?: boolean; fontSize: number }>(
  ({ bold, fontSize }) => ({
    color: "white",
    fontSize,
    fontWeight: bold ? "bold" : "normal",
    whiteSpace: "nowrap",
  }),
);

const Spinner = styled.div({
  width: 12,
  height: 12,
  border: "2px solid rgba(255,255,255,0.3)",
  borderTop: "2px solid white",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
  margin: "0 4px",
  "@keyframes spin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
});

export default Tag;
