# Guia de Implantação na Vercel

Este projeto já está configurado para ser implantado na [Vercel](https://vercel.com). Siga os passos abaixo:

## 1. Pré-requisitos
- Uma conta na Vercel (pode criar com o GitHub).
- O projeto enviado para o seu GitHub (já feito).

## 2. Passos na Vercel
1.  Acesse o [Dashboard da Vercel](https://vercel.com/dashboard).
2.  Clique em **"Add New..."** -> **"Project"**.
3.  Importe o repositório `Almoxarifado-Pro`.
4.  Na tela de configuração:
    - **Framework Preset**: A Vercel deve detectar automaticamente como `Vite`. Se não, selecione `Vite`.
    - **Root Directory**: Mantenha como está (raiz).
5.  **Environment Variables** (Variáveis de Ambiente):
    - Abra a seção "Environment Variables".
    - Adicione as chaves que estão no seu arquivo `.env`:
        - `GEMINI_API_KEY`: Cole o valor da sua chave API do Gemini.
        - `VITE_SUPABASE_URL`: Sua URL do Supabase.
        - `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.
    *(Nota: Se houver outras variáveis no .env, adicione-as também)*.

6.  Clique em **"Deploy"**.

## 3. Verificação
- Aguarde o processo de build terminar.
- Se houver algum erro, verifique os "Logs" na Vercel.
- O arquivo `vercel.json` incluído no projeto garante que as rotas funcionem corretamente (evitando erro 404 ao atualizar a página).
