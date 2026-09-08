import { useEffect, useRef, useId } from "react";
import type { Frame } from "../../../shared/protocol";
export function Penguin({
  frame,
  happy = false,
  thumbnail = false,
}: {
  frame: Frame;
  happy?: boolean;
  thumbnail?: boolean;
}) {
  const uid = useId();
  const eyes = useRef<SVGGElement>(null);
  const aim = useRef(frame.mouse);
  aim.current = frame.mouse;
  const followX = thumbnail
    ? 0
    : Math.max(-5, Math.min(5, (frame.mouse.x - 140) * 0.02));
  const followY = thumbnail
    ? 0
    : Math.max(-3, Math.min(3, (frame.mouse.y - 130) * 0.014));
  useEffect(() => {
    if (thumbnail) return;
    let id = 0,
      x = 0,
      y = 0;
    const draw = () => {
      const dx = aim.current.x - 140,
        dy = aim.current.y - 119,
        d = Math.hypot(dx, dy),
        r = Math.min(8, d * 0.065);
      x += ((d ? (dx / d) * r : 0) - x) * 0.17;
      y += ((d ? (dy / d) * r : 0) - y) * 0.17;
      eyes.current?.setAttribute("transform", `translate(${x} ${y})`);
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, [thumbnail]);
  return (
    <svg
      className={`penguin ${frame.state} ${happy ? "happy" : ""}`}
      style={{ transform: `translate(${followX}px, ${followY}px)` }}
      viewBox="0 0 280 280"
      aria-label="Pali 小企鵝"
    >
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#425767" />
          <stop offset=".65" stopColor="#243442" />
          <stop offset="1" stopColor="#182733" />
        </linearGradient>
        <linearGradient id={`${uid}-belly`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fffef9" />
          <stop offset="1" stopColor="#e4ecea" />
        </linearGradient>
        <linearGradient id={`${uid}-scarf`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f39472" />
          <stop offset="1" stopColor="#dd654f" />
        </linearGradient>
      </defs>
      <ellipse
        className="shadow"
        cx="141"
        cy="251"
        rx="63"
        ry="8"
        fill="#142b3a"
        opacity=".13"
      />
      <g className="character">
        <g className="feet" fill="#f1b05c">
          <ellipse
            className="foot left"
            cx="112"
            cy="238"
            rx="25"
            ry="11"
            transform="rotate(-9 112 238)"
          />
          <ellipse
            className="foot right"
            cx="170"
            cy="238"
            rx="25"
            ry="11"
            transform="rotate(9 170 238)"
          />
        </g>
        <path
          className="wing wing-left"
          d="M86 133C58 140 46 176 57 189C65 194 84 174 97 151Z"
          fill="#2d414f"
        />
        <path
          className="wing wing-right"
          d="M194 132C219 143 234 175 223 189C214 195 195 170 184 150Z"
          fill="#243845"
        />
        <path
          d="M75 164C70 133 75 81 104 61C117 51 130 50 138 52C144 40 159 38 167 44L157 54C191 59 207 91 207 132C207 149 216 178 207 203C197 235 174 243 140 243C100 243 77 231 71 204C68 189 72 176 75 164Z"
          fill={`url(#${uid}-body)`}
        />
        <path
          d="M89 127C84 107 93 82 112 81C125 80 135 87 140 98C146 86 156 79 170 82C189 86 195 108 190 128C188 142 181 145 192 169C208 207 186 230 141 230C96 230 77 208 88 175C96 153 94 143 89 127Z"
          fill={`url(#${uid}-belly)`}
        />
        <path
          d="M91 80Q109 61 130 65"
          fill="none"
          stroke="#7c909b"
          strokeWidth="5"
          strokeLinecap="round"
          opacity=".25"
        />
        <g className="eye-open">
          <ellipse cx="115" cy="116" rx="15" ry="18" fill="white" />
          <ellipse cx="165" cy="116" rx="15" ry="18" fill="white" />
          <g ref={eyes}>
            <ellipse cx="115" cy="117" rx="8.5" ry="11" fill="#233440" />
            <ellipse cx="165" cy="117" rx="8.5" ry="11" fill="#233440" />
            <circle cx="112" cy="113" r="3" fill="white" />
            <circle cx="162" cy="113" r="3" fill="white" />
          </g>
        </g>
        <g
          className="eye-closed"
          fill="none"
          stroke="#2c414b"
          strokeWidth="4"
          strokeLinecap="round"
        >
          <path d="M105 119Q115 127 125 119M155 119Q165 127 175 119" />
        </g>
        <ellipse cx="98" cy="137" rx="12" ry="6" fill="#efaa9d" opacity=".52" />
        <ellipse
          cx="182"
          cy="137"
          rx="12"
          ry="6"
          fill="#efaa9d"
          opacity=".52"
        />
        <path
          d="M128 136Q140 126 152 136Q151 145 140 148Q129 145 128 136"
          fill="#efad56"
        />
        <path
          d="M130 137Q140 140 150 137"
          stroke="#d18b42"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M89 158Q140 179 193 157L191 174Q141 195 91 176Z"
          fill={`url(#${uid}-scarf)`}
        />
        <path
          className="scarf-tail"
          d="M163 177L185 173L191 213Q181 221 167 214Z"
          fill={`url(#${uid}-scarf)`}
        />
        <path d="M171 205L188 202" stroke="#f9c1a4" strokeWidth="3" />
        <path
          d="M106 190Q97 206 109 214"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          opacity=".6"
        />
      </g>
    </svg>
  );
}
