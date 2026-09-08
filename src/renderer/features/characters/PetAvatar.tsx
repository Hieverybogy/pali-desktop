import { useEffect, useId, useRef } from "react";
import type { Frame } from "../../../shared/protocol";
import { CartoonPet } from "./CartoonPet";
import { Penguin } from "./Penguin";
import pets from "../../../shared/pets.json";

export function PetAvatar({
  frame,
  happy = false,
  thumbnail = false,
}: {
  frame: Frame;
  happy?: boolean;
  thumbnail?: boolean;
}) {
  if (["doraemon", "luoxiaohei", "shiro"].includes(frame.character))
    return <CartoonPet frame={frame} happy={happy} thumbnail={thumbnail} />;
  if (frame.character === "penguin")
    return (
      <div className={thumbnail ? "avatar thumbnail" : "avatar"}>
        <Penguin frame={frame} happy={happy} thumbnail={thumbnail} />
      </div>
    );
  return <Animal frame={frame} happy={happy} thumbnail={thumbnail} />;
}
function Animal({
  frame,
  happy,
  thumbnail,
}: {
  frame: Frame;
  happy: boolean;
  thumbnail: boolean;
}) {
  const pet = pets.find((p) => p.id === frame.character) ?? pets[0];
  const kind = pet.id,
    uid = useId(),
    eyes = useRef<SVGGElement>(null),
    aim = useRef(frame.mouse);
  aim.current = frame.mouse;
  useEffect(() => {
    if (thumbnail) return;
    let raf = 0,
      x = 0,
      y = 0;
    const draw = () => {
      const dx = aim.current.x - 140,
        dy = aim.current.y - 119,
        d = Math.hypot(dx, dy),
        r = Math.min(6, d * 0.06);
      x += ((d ? (dx / d) * r : 0) - x) * 0.17;
      y += ((d ? (dy / d) * r : 0) - y) * 0.17;
      eyes.current?.setAttribute("transform", `translate(${x} ${y})`);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [thumbnail]);
  const bird = kind === "owl" || kind === "chick",
    frog = kind === "frog",
    panda = kind === "panda";
  return (
    <div className={`avatar ${thumbnail ? "thumbnail" : ""}`}>
      <svg
        viewBox="0 0 280 280"
        className={`penguin ${frame.state} ${happy ? "happy" : ""}`}
        aria-label={`Pali ${pet.species}${pet.name}`}
      >
        <defs>
          <linearGradient id={`${uid}-coat`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={pet.color} />
            <stop offset="1" stopColor={pet.dark} />
          </linearGradient>
        </defs>
        <ellipse
          cx="140"
          cy="251"
          rx="64"
          ry="8"
          fill="#263c45"
          opacity=".12"
        />
        <g className="character">
          {kind === "cat" && (
            <path
              d="M194 216C248 227 239 164 218 178"
              fill="none"
              stroke={pet.color}
              strokeWidth="21"
              strokeLinecap="round"
            />
          )}
          {kind === "shiba" && (
            <path
              d="M197 210C249 211 236 167 217 180C203 190 223 206 227 190"
              fill="none"
              stroke={pet.color}
              strokeWidth="20"
              strokeLinecap="round"
            />
          )}
          {kind === "mouse" && (
            <path
              d="M195 220C249 234 252 178 222 177C205 176 209 198 229 194"
              fill="none"
              stroke={pet.color}
              strokeWidth="12"
              strokeLinecap="round"
            />
          )}
          {kind === "fox" && (
            <>
              <path
                d="M183 228C246 245 255 185 239 149C233 183 198 166 183 228"
                fill={pet.color}
              />
              <path
                d="M224 184Q239 176 239 149Q253 179 243 203Z"
                fill={pet.light}
              />
            </>
          )}
          {kind === "dragon" && (
            <>
              <path
                d="M192 225Q244 245 249 206Q226 220 212 183Z"
                fill={pet.dark}
              />
              <path
                d="M210 192L220 180L228 207L238 197L241 221"
                fill={pet.accent}
              />
              <path
                d="M92 151L48 123L51 174L88 191M188 151L232 123L229 174L192 191"
                fill={pet.dark}
              />
              <path
                d="M83 154L56 137L60 171L83 180M197 154L224 137L220 171L197 180"
                fill={pet.accent}
              />
            </>
          )}
          {kind === "rabbit" && (
            <circle cx="202" cy="212" r="22" fill={pet.light} />
          )}
          <ellipse
            className="foot left"
            cx="111"
            cy="239"
            rx="24"
            ry="11"
            fill={bird ? "#e1b568" : pet.dark}
          />
          <ellipse
            className="foot right"
            cx="169"
            cy="239"
            rx="24"
            ry="11"
            fill={bird ? "#e1b568" : pet.dark}
          />
          {["cat", "fox", "shiba"].includes(kind) && (
            <>
              <path
                className="ear"
                d="M80 100L77 40Q106 44 120 78M160 78Q179 45 203 40L202 101"
                fill={pet.color}
              />
              <path
                className="ear"
                d="M88 80L87 53L109 79M170 79L193 53L193 80"
                fill={kind === "cat" ? "#e3a4a0" : pet.dark}
              />
            </>
          )}
          {kind === "mouse" && (
            <>
              <circle cx="99" cy="73" r="29" fill={pet.color} />
              <circle cx="181" cy="73" r="29" fill={pet.color} />
              <circle cx="99" cy="73" r="17" fill={pet.light} />
              <circle cx="181" cy="73" r="17" fill={pet.light} />
            </>
          )}
          {kind === "rabbit" && (
            <>
              <ellipse
                className="ear"
                cx="107"
                cy="63"
                rx="19"
                ry="48"
                fill={pet.color}
                transform="rotate(-12 107 63)"
              />
              <ellipse
                className="ear"
                cx="174"
                cy="63"
                rx="19"
                ry="48"
                fill={pet.color}
                transform="rotate(12 174 63)"
              />
              <ellipse
                className="ear"
                cx="107"
                cy="58"
                rx="8"
                ry="32"
                fill="#eab8bb"
                transform="rotate(-12 107 58)"
              />
              <ellipse
                className="ear"
                cx="174"
                cy="58"
                rx="8"
                ry="32"
                fill="#eab8bb"
                transform="rotate(12 174 58)"
              />
            </>
          )}
          {["panda", "bear"].includes(kind) && (
            <>
              <circle className="ear" cx="88" cy="76" r="26" fill={pet.dark} />
              <circle className="ear" cx="192" cy="76" r="26" fill={pet.dark} />
              <circle
                className="ear"
                cx="88"
                cy="76"
                r="14"
                fill={panda ? pet.dark : pet.light}
              />
              <circle
                className="ear"
                cx="192"
                cy="76"
                r="14"
                fill={panda ? pet.dark : pet.light}
              />
            </>
          )}
          {bird && (
            <path
              className="ear"
              d="M81 101L73 52L116 76M164 76L207 52L199 101"
              fill={pet.dark}
            />
          )}
          {kind === "dragon" && (
            <>
              <path
                className="ear"
                d="M93 86Q77 63 94 42L111 75M169 75L186 42Q203 63 187 86"
                fill={pet.accent}
              />
              <path d="M127 75L140 50L153 75" fill={pet.dark} />
            </>
          )}
          {kind === "chick" && (
            <path d="M126 68L140 40L146 62L164 45L160 78Z" fill={pet.dark} />
          )}
          <path
            className="wing wing-left"
            d="M88 144Q53 149 58 194Q64 209 88 185"
            fill={panda ? pet.dark : pet.color}
          />
          <path
            className="wing wing-right"
            d="M192 144Q227 149 222 194Q216 209 192 185"
            fill={panda ? pet.dark : pet.color}
          />
          <path
            d="M78 155C65 116 77 75 110 68Q140 56 170 68C203 75 215 116 202 155Q223 207 197 231Q178 246 140 244Q102 246 83 231Q57 207 78 155"
            fill={panda ? pet.light : `url(#${uid}-coat)`}
          />
          <ellipse cx="140" cy="195" rx="49" ry="39" fill={pet.light} />
          {frog && (
            <>
              <circle cx="105" cy="84" r="30" fill={pet.color} />
              <circle cx="175" cy="84" r="30" fill={pet.color} />
            </>
          )}
          {["fox", "shiba", "cat", "rabbit"].includes(kind) && (
            <path
              d="M85 124Q100 139 116 128Q140 144 164 128Q180 139 195 124Q199 170 140 173Q81 170 85 124"
              fill={pet.light}
            />
          )}
          {bird && (
            <>
              <ellipse
                cx="111"
                cy="119"
                rx="34"
                ry="41"
                fill={pet.light}
                transform="rotate(-10 111 119)"
              />
              <ellipse
                cx="169"
                cy="119"
                rx="34"
                ry="41"
                fill={pet.light}
                transform="rotate(10 169 119)"
              />
              <path
                d="M116 180L125 190L134 180M146 180L155 190L164 180M131 203L140 213L149 203"
                fill="none"
                stroke={pet.color}
                strokeWidth="5"
                strokeLinecap="round"
              />
            </>
          )}
          {panda && (
            <>
              <ellipse
                cx="113"
                cy="117"
                rx="24"
                ry="29"
                fill={pet.dark}
                transform="rotate(22 113 117)"
              />
              <ellipse
                cx="167"
                cy="117"
                rx="24"
                ry="29"
                fill={pet.dark}
                transform="rotate(-22 167 117)"
              />
            </>
          )}
          {kind === "bear" && (
            <ellipse cx="140" cy="142" rx="28" ry="21" fill={pet.light} />
          )}
          {kind === "cat" && (
            <g
              fill="none"
              stroke={pet.dark}
              strokeWidth="6"
              strokeLinecap="round"
            >
              <path d="M126 70L130 84M140 66L140 82M154 70L150 84" />
            </g>
          )}
          {kind === "mouse" && (
            <g
              fill="none"
              stroke={pet.dark}
              strokeWidth="4"
              strokeLinecap="round"
            >
              <path d="M91 140L66 134M91 148L64 150M189 140L214 134M189 148L216 150" />
            </g>
          )}
          {kind === "shiba" && (
            <g fill={pet.light}>
              <ellipse
                cx="112"
                cy="96"
                rx="9"
                ry="4"
                transform="rotate(-15 112 96)"
              />
              <ellipse
                cx="168"
                cy="96"
                rx="9"
                ry="4"
                transform="rotate(15 168 96)"
              />
            </g>
          )}
          <g className="eye-open">
            <ellipse cx="115" cy="117" rx="14" ry="17" fill="white" />
            <ellipse cx="165" cy="117" rx="14" ry="17" fill="white" />
            <g ref={eyes}>
              <ellipse cx="115" cy="119" rx="7" ry="10" fill="#293a42" />
              <ellipse cx="165" cy="119" rx="7" ry="10" fill="#293a42" />
              <circle cx="112" cy="115" r="2.7" fill="white" />
              <circle cx="162" cy="115" r="2.7" fill="white" />
            </g>
          </g>
          <g
            className="eye-closed"
            fill="none"
            stroke={panda ? "#f7f0df" : "#34484c"}
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M105 119Q115 127 125 119M155 119Q165 127 175 119" />
          </g>
          <ellipse
            cx="95"
            cy="140"
            rx="10"
            ry="5"
            fill="#e4a0a0"
            opacity=".65"
          />
          <ellipse
            cx="185"
            cy="140"
            rx="10"
            ry="5"
            fill="#e4a0a0"
            opacity=".65"
          />
          {bird ? (
            <path d="M130 140L140 156L150 140Q140 133 130 140" fill="#dfac5b" />
          ) : frog ? (
            <path
              d="M119 143Q140 160 161 143"
              fill="none"
              stroke={pet.dark}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : (
            <>
              <path
                d="M132 137Q140 132 148 137Q147 145 140 146Q133 144 132 137"
                fill={kind === "rabbit" ? "#d393a3" : "#594941"}
              />
              <path
                d="M140 145V149Q131 155 127 148M140 149Q149 155 153 148"
                fill="none"
                stroke="#715b50"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          )}
          {kind === "cat" && (
            <path
              d="M91 141L71 137M90 148L69 150M189 141L209 137M190 148L211 150"
              fill="none"
              stroke={pet.dark}
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          {kind === "dragon" && (
            <g fill={pet.dark} opacity=".55">
              <circle cx="121" cy="181" r="3" />
              <circle cx="141" cy="185" r="3" />
              <circle cx="157" cy="177" r="3" />
            </g>
          )}
          {bird ? (
            <>
              <path
                d="M93 163Q140 183 187 163L183 177Q140 196 97 177"
                fill={pet.accent}
              />
              <path d="M165 181L183 177L191 209L172 213Z" fill={pet.accent} />
            </>
          ) : (
            <>
              <path
                d="M99 163Q140 178 181 163L179 175Q140 190 101 175"
                fill={pet.accent}
              />
              <circle cx="140" cy="180" r="9" fill="#f7d58b" />
              <path d="M140 179V184" stroke="#b68e54" strokeWidth="2" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
