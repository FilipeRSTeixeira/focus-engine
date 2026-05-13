# Focus Engine — Instalação

Guia para pôr a Focus Engine a correr no teu PC Windows. A app corre **localmente** — toda a tua informação fica no teu computador.

## 1. Pré-requisitos

Precisas de ter instalado:

- **Node.js 20 ou superior** ([nodejs.org](https://nodejs.org/) — descarrega a versão "LTS")
- **PowerShell** (já vem no Windows)
- Cerca de **500 MB de espaço em disco**

Para confirmar que tens Node.js, abre o PowerShell e escreve:

```powershell
node --version
```

Deves ver algo como `v20.x.x` ou superior. Se não vires, instala o Node.js primeiro.

## 2. Instalação rápida (recomendada)

Dentro da pasta da Focus Engine, abre o PowerShell e corre:

```powershell
.\setup.ps1
```

O script trata de tudo automaticamente: instala dependências, prepara a base de dados e oferece-te arrancar a app. Demora 2 a 5 minutos da primeira vez.

> **Se aparecer um erro de "execution policy":** corre primeiro este comando no PowerShell para autorizar a execução de scripts (só nesta sessão):
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

## 3. Instalação manual (passo-a-passo)

Se preferires fazer à mão, dentro da pasta da app:

```powershell
# 1. Instalar dependências
npm install

# 2. Gerar o cliente Prisma
npx prisma generate

# 3. Criar a base de dados (SQLite)
npx prisma migrate deploy

# 4. Arrancar a app
npm run dev
```

## 4. Aceder à app

Com a app a correr, abre o browser em:

**http://localhost:3210**

Para fechar a app, volta ao PowerShell e carrega `Ctrl+C`. Para a abrir noutro dia, basta correr `npm run dev` na pasta.

## 5. Ligar ao Google Calendar (opcional)

A integração com o Google Calendar permite que as tarefas que crias na app apareçam automaticamente no teu calendário. **Cada utilizador tem de criar as suas próprias credenciais** numa conta gratuita da Google Cloud Console.

Na app, vai a **Definições** (na barra lateral) e segue as instruções da secção *"Como obter Client ID e Client Secret?"*. Lá tens:

- Um resumo dos 7 passos.
- Um **prompt pronto a copiar** para colares num ChatGPT/Claude/Gemini, que te guia em conversa.

O processo demora tipicamente 10–15 minutos da primeira vez. Não precisas de ser developer.

## 6. Onde fica guardada a tua informação

Tudo fica no teu PC, nesta pasta:

- `prisma/dev.db` — tarefas, projectos, pontos, recompensas, histórico.
- `google-token.json` — token de acesso ao teu Google Calendar (se ligares).
- A informação **nunca é enviada para a internet**, excepto se ligares ao Google Calendar (e mesmo aí só comunica com a tua conta Google, directamente).

Para fazer backup, copia simplesmente a pasta `prisma/`.

## 7. Resolução de problemas

**"node não é reconhecido…"** — O Node.js não está instalado ou não está no PATH. Instala-o de [nodejs.org](https://nodejs.org/) e reinicia o PowerShell.

**"npm install falha com permissões"** — Corre o PowerShell como administrador, ou usa uma pasta dentro de `C:\Users\<oTeuNome>\` em vez de `C:\Program Files\`.

**"Porta 3210 já em uso"** — Outra coisa está a usar essa porta. Fecha-a, ou edita `package.json` e muda `next dev -p 3210` para outra porta (ex.: `-p 3211`). Se mudares a porta, também tens de actualizar o Redirect URI nas Definições do Calendar.

**"A app abre mas não mostra dados"** — Reinicia a app (`Ctrl+C` no PowerShell e `npm run dev` outra vez). Se persistir, verifica se o ficheiro `prisma/dev.db` existe.

**"O Calendar não está a ligar"** — Confirma em Definições que tens Client ID e Client Secret correctos, e que o Redirect URI registado na Google Cloud Console é **exactamente** `http://localhost:3210/api/auth/google/callback`.

## 8. Actualizar para uma versão nova

Quando receberes uma versão actualizada da app:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
```

Os teus dados (`prisma/dev.db`) ficam intactos.

## 9. Apagar tudo

Se quiseres apagar toda a informação e começar do zero, apaga os ficheiros `prisma/dev.db` e `google-token.json`. Depois corre `npx prisma migrate deploy` outra vez para recriar a base de dados vazia.
