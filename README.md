# itawebvup

Projeto full-stack (frontend React + backend Express + Firebase + Functions) para gestao de eventos e pagamentos.

## Estrutura

- `frontend/`: aplicacao web (Vite + React)
- `backend/`: API Node/Express (pagamentos, upload, import controlado)
- `functions/`: Cloud Functions (envio de email de confirmacao)
- `firestore.rules` / `storage.rules`: regras de seguranca

## Requisitos

- Node.js 18+
- NPM 9+
- Firebase CLI (para deploy de rules/functions)

## Configuracao

1. Copie os arquivos de exemplo:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env`
2. Preencha as variaveis obrigatorias (Firebase, provider de pagamento, URLs e secrets).
3. Nunca commite `.env`, chaves privadas, dumps de credenciais ou arquivos de importacao com dados sensiveis.

## Executar localmente

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Scripts uteis

### Criar/atualizar admin com custom claim

```bash
cd backend
npm run create-admin -- --email=admin@seu-dominio.com --password=SuaSenhaForte
```

### Importar excursoes (manual)

```bash
cd backend
npm run import-excursions -- ./data/imports/excursoes.json
```

## Seguranca operacional

- Rotacione imediatamente qualquer credencial vazada.
- Mantenha apenas um endpoint canonico de pagamento: `POST /api/payment/create-preference`.
- Webhooks devem ficar ativos somente com secrets configurados.
- Nao permita escrita de pedidos (`users/{uid}/orders`) pelo frontend.
- Use custom claim `admin=true` para recursos administrativos.

## Deploy de regras Firebase

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

