const password = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?\d)(?=.*?[#?!@$ %^&*-]).{8,}$/;

const uuid =
  /^[0-9a-f]{8}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{12}$/gim;

export const RegexHelper = { password, uuid };
