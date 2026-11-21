# NLP training samples

Os samples estaticos de treino dos classificadores ficam em JSON em `src/modules/nlp/classifiers/samples`.

Esses arquivos representam dados de treino, nao logica de produto. O codigo TypeScript deve consumir os dados pelo loader `static-training.samples.ts`, mantendo o contrato `TrainingSample[]` e evitando que listas longas de exemplos sejam tratadas como codigo duplicado ou cobertura exigivel no Quality Gate.

Quando novos samples forem adicionados:

- mantenha o formato `{ "text": "...", "label": "..." }`;
- nao coloque regra de negocio no JSON;
- ajuste o loader apenas se houver novo conjunto de treino;
- preserve os arquivos de dados fora das metricas de cobertura e duplicacao do Sonar.
