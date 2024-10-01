import styles from "./tooltip.module.scss";

export const Tooltip = ({
  addState,
  newLineLength,
}: {
  addState: "point" | "line" | null;
  newLineLength: number;
}) => {
  let str = "";

  if (addState && str !== addState) {
    switch (addState) {
      case "point":
        str = "Нажмите на карту чтобы добавить точку";
        break;
      case "line":
        str = !newLineLength
          ? "Добавьте начальную точку линии"
          : "Добавьте конечную точку линии";
        break;
      default:
        break;
    }
  }

  return (
    <div
      className={styles.tooltip}
      aria-hidden={addState === null || undefined}
    >
      {str}
    </div>
  );
};
