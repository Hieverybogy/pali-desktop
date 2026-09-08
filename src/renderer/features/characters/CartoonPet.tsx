import { useEffect, useRef } from "react";
import type { Frame } from "../../../shared/protocol";
export function CartoonPet({
  frame,
  happy,
  thumbnail,
}: {
  frame: Frame;
  happy: boolean;
  thumbnail: boolean;
}) {
  const eyes = useRef<SVGGElement>(null),
    aim = useRef(frame.mouse);
  aim.current = frame.mouse;
  useEffect(() => {
    if (thumbnail) return;
    let raf = 0;
    const draw = () => {
      const dx = aim.current.x - 140,
        dy = aim.current.y - 114,
        d = Math.hypot(dx, dy),
        r = Math.min(5, d * 0.05);
      eyes.current?.setAttribute(
        "transform",
        `translate(${d ? (dx / d) * r : 0} ${d ? (dy / d) * r : 0})`,
      );
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [thumbnail]);
  const dora = frame.character === "doraemon",
    black = frame.character === "luoxiaohei";
  const coat = dora ? "#139cdd" : black ? "#252b30" : "#fffdf7",
    outline = black ? "#151c20" : "#49545b";
  return (
    <div className={`avatar ${thumbnail ? "thumbnail" : ""}`}>
      <svg
        viewBox="0 0 280 280"
        className={`penguin ${frame.state} ${happy ? "happy" : ""}`}
        aria-label={dora ? "哆啦 A 夢" : black ? "羅小黑" : "小白"}
      >
        <ellipse
          cx="140"
          cy="251"
          rx="65"
          ry="8"
          fill="#263c45"
          opacity=".12"
        />
        <g
          className="character"
          stroke={outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {black && (
            <path
              d="M184 210Q247 242 240 188Q235 170 221 185"
              fill="none"
              stroke={coat}
              strokeWidth="17"
            />
          )}
          {!dora && !black && (
            <path d="M189 202Q231 168 225 200Q221 218 193 218" fill="#fffdf7" />
          )}
          <ellipse
            className="foot left"
            cx="110"
            cy="239"
            rx="26"
            ry="12"
            fill={dora ? "white" : coat}
          />
          <ellipse
            className="foot right"
            cx="170"
            cy="239"
            rx="26"
            ry="12"
            fill={dora ? "white" : coat}
          />
          <g className="wing wing-left">
            <path d="M89 145Q57 148 57 186Q61 205 79 192L97 162" fill={coat} />
            {dora && <circle cx="65" cy="190" r="15" fill="white" />}
          </g>
          <g className="wing wing-right">
            <path
              d="M191 145Q223 148 223 186Q219 205 201 192L183 162"
              fill={coat}
            />
            {dora && <circle cx="215" cy="190" r="15" fill="white" />}
          </g>
          <path
            d="M88 153Q140 132 192 153L201 214Q202 239 170 239H110Q78 239 79 214Z"
            fill={coat}
          />
          {dora && (
            <>
              <ellipse cx="140" cy="194" rx="43" ry="37" fill="white" />
              <path
                d="M108 191H172Q168 219 140 220Q112 219 108 191Z"
                fill="white"
              />
            </>
          )}
          {black && (
            <>
              <path
                className="ear"
                d="M78 105L70 35Q100 37 116 72"
                fill={coat}
              />
              <path
                className="ear"
                d="M164 72Q180 37 210 35L202 105"
                fill={coat}
              />
              <path
                d="M80 77L79 48L103 73M177 73L201 48L200 77"
                fill="#5b6267"
                stroke="none"
              />
            </>
          )}
          {dora ? (
            <>
              <ellipse cx="140" cy="105" rx="79" ry="72" fill={coat} />
              <ellipse cx="140" cy="121" rx="66" ry="52" fill="white" />
            </>
          ) : black ? (
            <path
              d="M72 94Q73 63 107 63Q140 54 174 63Q207 63 208 99L207 130Q202 170 140 172Q78 170 73 133Z"
              fill={coat}
            />
          ) : (
            <>
              <path
                className="ear"
                d="M85 86Q52 69 47 105Q46 137 69 145L92 123"
                fill={coat}
              />
              <path
                className="ear"
                d="M195 86Q228 69 233 105Q234 137 211 145L188 123"
                fill={coat}
              />
              <path
                d="M77 100Q65 84 79 72Q88 64 101 69Q103 53 120 57Q138 43 151 57Q171 51 180 67Q205 61 207 84Q220 98 208 113Q220 146 193 160Q171 175 140 170Q104 176 82 158Q60 142 77 100Z"
                fill={coat}
              />
            </>
          )}
          <g className="eye-open" stroke="none">
            {dora ? (
              <>
                <ellipse
                  cx="123"
                  cy="88"
                  rx="17"
                  ry="23"
                  fill="white"
                  stroke={outline}
                />
                <ellipse
                  cx="157"
                  cy="88"
                  rx="17"
                  ry="23"
                  fill="white"
                  stroke={outline}
                />
              </>
            ) : black ? (
              <>
                <ellipse cx="110" cy="111" rx="21" ry="24" fill="#a8dacc" />
                <ellipse cx="170" cy="111" rx="21" ry="24" fill="#a8dacc" />
              </>
            ) : null}
            <g ref={eyes}>
              <ellipse
                cx={dora ? 126 : 110}
                cy={dora ? 94 : 112}
                rx={dora ? 5 : black ? 10 : 5}
                ry={dora ? 8 : black ? 17 : 7}
                fill="#172027"
              />
              <ellipse
                cx={dora ? 154 : 170}
                cy={dora ? 94 : 112}
                rx={dora ? 5 : black ? 10 : 5}
                ry={dora ? 8 : black ? 17 : 7}
                fill="#172027"
              />
              {black && (
                <>
                  <circle cx="106" cy="105" r="4" fill="white" />
                  <circle cx="166" cy="105" r="4" fill="white" />
                </>
              )}
            </g>
          </g>
          <g
            className="eye-closed"
            fill="none"
            stroke={black ? "#b9e6da" : outline}
            strokeWidth="3"
          >
            <path
              d={
                dora
                  ? "M112 93Q122 103 132 93M148 93Q158 103 168 93"
                  : "M100 112Q110 122 120 112M160 112Q170 122 180 112"
              }
            />
          </g>
          {dora ? (
            <>
              <circle cx="140" cy="111" r="10" fill="#e64143" />
              <circle cx="137" cy="108" r="3" fill="white" stroke="none" />
              <path
                d="M140 121V150M97 134Q140 170 183 134M106 116L78 109M105 127H76M108 138L82 145M174 116L202 109M175 127H204M172 138L198 145"
                fill="none"
                strokeWidth="2"
              />
              <path
                d="M91 166Q140 181 189 166L188 176Q140 190 92 176Z"
                fill="#e54143"
              />
              <circle cx="140" cy="183" r="12" fill="#ffdc57" />
              <path d="M129 181H151M140 187V194" />
              <circle cx="140" cy="187" r="2.5" fill={outline} />
            </>
          ) : black ? (
            <>
              <path
                d="M134 133Q140 129 146 133L140 139Z"
                fill="#dfacaf"
                stroke="none"
              />
              <path
                d="M140 139V145M129 144Q134 150 140 145Q146 150 151 144"
                fill="none"
                stroke="#b9c5c5"
                strokeWidth="2"
              />
            </>
          ) : (
            <>
              <ellipse cx="140" cy="130" rx="12" ry="8" fill="#252c32" />
              <path
                d="M140 138V145Q128 156 120 145M140 145Q152 156 160 145"
                fill="none"
              />
              <ellipse
                cx="91"
                cy="137"
                rx="10"
                ry="5"
                fill="#f4c7c3"
                stroke="none"
              />
              <ellipse
                cx="189"
                cy="137"
                rx="10"
                ry="5"
                fill="#f4c7c3"
                stroke="none"
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
