import jwt from "jsonwebtoken";

export type AccessPayload = {
  sub: string;
  email: string;
  role: string;
  type: "access";
};

export type RefreshPayload = {
  sub: string;
  type: "refresh";
};

function getSecret(kind: "access" | "refresh"): string {
  const key = kind === "access" ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;
  if (!key || key.length < 16) {
    throw new Error("JWT secret not configured");
  }
  return key;
}

export function signAccessToken(payload: Omit<AccessPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, getSecret("access"), {
    expiresIn: "15m",
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, getSecret("refresh"), {
    expiresIn: "7d",
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, getSecret("access")) as AccessPayload;
  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, getSecret("refresh")) as RefreshPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
}
