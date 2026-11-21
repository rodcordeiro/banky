# Saldo no *contrato* chama-se `ammount`

O campo de saldo da Account já está na persistência e no *contrato* HTTP com a grafia `ammount` (dois m). Mantemos essa grafia em payloads, entidades e docs de *contrato*; não “corrigir” para `amount`. Renomear quebraria app, MCP e dados existentes. A palavra de domínio continua **Saldo**.
