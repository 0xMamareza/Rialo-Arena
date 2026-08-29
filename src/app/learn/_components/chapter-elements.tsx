import type { ReactNode } from "react";

import styles from "../learn.module.css";

export type ChapterFact = {
  label: string;
  value: string;
};

export type StudyNote = {
  title: string;
  body: ReactNode;
};

type ChapterFactsProps = {
  facts: readonly ChapterFact[];
  headingId: string;
};

type StudyNotesProps = {
  notes: readonly StudyNote[];
  headingId: string;
  sourceHref: string;
  sourceLabel: string;
  sourceType: string;
};

export function ChapterFacts({ facts, headingId }: ChapterFactsProps) {
  return (
    <section className={styles.factSection} aria-labelledby={headingId}>
      <header className={styles.knowledgeHeader}>
        <span>Key facts</span>
        <h2 id={headingId}>Keep these in view.</h2>
      </header>
      <dl className={styles.factGrid}>
        {facts.map((fact, index) => (
          <div key={fact.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StudyNotes({
  notes,
  headingId,
  sourceHref,
  sourceLabel,
  sourceType,
}: StudyNotesProps) {
  return (
    <section className={styles.studyNotes} aria-labelledby={headingId}>
      <header className={styles.knowledgeHeader}>
        <span>Study notes</span>
        <h2 id={headingId}>Go one layer deeper.</h2>
      </header>

      <div className={styles.noteList}>
        {notes.map((note, index) => (
          <details key={note.title}>
            <summary>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{note.title}</strong>
              <i aria-hidden="true">+</i>
            </summary>
            <div>{note.body}</div>
          </details>
        ))}
      </div>

      <div className={styles.readingCta}>
        <p>Learn gives you the model. Official sources provide the deeper detail.</p>
        <a
          className={styles.primaryReading}
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>{sourceType}</span>
          <strong>{sourceLabel}</strong>
          <i aria-hidden="true">↗</i>
        </a>
      </div>
    </section>
  );
}
