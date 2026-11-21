# Quatro fontes, um papel cada

As specs da banky-api divergiam porque o mesmo fato vivia em glossário, catálogo HTTP, playbook e Nero com datas diferentes. A divisão vigente é: `CONTEXT.md` só linguagem de domínio; a skill `$banky-api` só *contrato* HTTP (lookup); o playbook de auto-review só operação; o Nero só knowledge operacional e decisões. Esta spec em `docs/spec-contrato-e-dominio.md` é o recorte grelhado do produto (comportamento atual vs lacunas abertas). Checkout de controller/DTO prevalece sobre a skill se divergirem.
