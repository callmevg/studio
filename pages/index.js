import styles from './index.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Welcome to FlowVerse</h1>
      <p className={styles.subtitle}>
        Your Next.js app is set up correctly.<br />
        Start building your metro map or application flow!
      </p>
      <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer" className={styles.button}>
        Next.js Documentation
      </a>
    </main>
  );
}
