
CREATE TABLE IF NOT EXISTS turmas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disciplinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT
);

CREATE TABLE IF NOT EXISTS professores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ambientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turma_id INTEGER NOT NULL,
    disciplina_id INTEGER,
    professor_id INTEGER,
    ambiente_id INTEGER,
    dia_semana INTEGER NOT NULL,
    numero_aula INTEGER NOT NULL,
    grupo TEXT NOT NULL DEFAULT 'ALL',
    inicio TEXT NOT NULL,
    fim TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'aula',
    observacao TEXT,

    FOREIGN KEY (turma_id) REFERENCES turmas(id),
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
    FOREIGN KEY (professor_id) REFERENCES professores(id),
    FOREIGN KEY (ambiente_id) REFERENCES ambientes(id),

    UNIQUE (turma_id, dia_semana, numero_aula, grupo)
);

CREATE INDEX IF NOT EXISTS idx_horarios_consulta
ON horarios (turma_id, dia_semana);