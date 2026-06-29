# Site da Volto

Site institucional estático da Volto — hub de estruturação para empresas em crescimento (Goiânia · Caldas Novas e região). Identidade LARTS aplicada de verdade (logo e monograma vetoriais autênticos, ícones proprietários, estampas, fotografia real) e movimento. Caminho de conversão: **Home → Diagnóstico 360 → Contato**.

## Estrutura
```
site/                      raiz do deploy (index.html na raiz)
├── index.html             Home
├── diagnostico-360.html   Diagnóstico 360 (porta de entrada)
├── contato.html           Triagem (form → WhatsApp) + contatos
├── css/volto-site.css     Sistema visual + animações
├── assets/                logo/monograma vetoriais, ícones, estampas, favicon
├── llms.txt · robots.txt · sitemap.xml
└── .gitignore
```

## Ver no computador
Dois cliques em `index.html`. Para servir como em produção: dentro de `site/` rode `python -m http.server` e abra `http://localhost:8000`.

## Fotografia
Fotos reais da Unsplash por hotlink, com crédito ao fotógrafo em cada faixa (regra da Unsplash). Para trocar: substitua a URL e atualize o crédito.

## Publicar
100% estático — custo ~zero. Recomendado **Cloudflare Pages** (ou Netlify), deploy automático, apontando **voltoconsultoria.com.br**.
> O repositório git NÃO deve viver dentro do OneDrive (corrompe o `.git`). Manter o repo fora do OneDrive ou no GitHub; a pasta no Centro de Controle serve para edição/iteração.

## Regras da marca (não violar)
Sem preços · público sempre "empresas em crescimento" (nunca "pequenos negócios") · identidade visual nunca do zero (sempre arquivos LARTS) · prova sem casos inventados.

## Próximos passos
Páginas de trilha e /metodo, /sobre · casos/depoimentos reais · imagem Open Graph (1200×630) · trocar para Argent CF quando licenciada.
