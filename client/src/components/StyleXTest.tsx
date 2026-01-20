import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: '1rem',
  },
  badge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  text: {
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
});

export default function StyleXTest() {
  return (
    <div {...stylex.props(styles.container)}>
      <span {...stylex.props(styles.badge)}>StyleX</span>
      <span {...stylex.props(styles.text)}>Working with MUI!</span>
    </div>
  );
}
