// exclusive-bem-block: homepage
import { ArrowUpRight, Check, CheckCheck, Hash, ListFilter, NotebookPen } from 'lucide-react';
import { DOCS_URL, GITHUB_URL, RELEASES_URL } from './constants';
import Header from './components/Header';
import GithubLink from './components/GithubLink';
import HabitRecordingExample from './components/HabitRecordingExample';
import VisualizationExamples from './components/VisualizationExamples';
import { habitExamples } from './data/habit-examples';
import useGithubMetadata from './hooks/use-github-metadata';
import useTheme from './hooks/use-theme';

const habitTypes = [
  {
    name: 'Summation',
    icon: Hash,
    description:
      'Track numeric values with configurable goals, schedules, and quick-add increments.',
    habit: habitExamples.summation,
  },
  {
    name: 'Note',
    icon: NotebookPen,
    description:
      'Record free-form notes, journal entries, or anything that doesn’t fit a structured habit.',
    habit: habitExamples.note,
  },
  {
    name: 'Single select',
    icon: ListFilter,
    description: 'Choose from a configurable list of options.',
    habit: habitExamples.singleSelect,
  },
  {
    name: 'Checkbox',
    icon: CheckCheck,
    description: 'Simple yes-or-no tracking.',
    habit: habitExamples.checkbox,
  },
];

export default function App() {
  const { stars, release } = useGithubMetadata();
  const { isDark, toggleTheme } = useTheme();
  const screenshotSuffix = isDark ? '' : '-light';

  return (
    <div id="top" className="homepage text-b-m">
      <a href="#main" className="homepage__skip">
        Skip to content
      </a>
      <div className="homepage__container">
        <Header stars={stars} isDark={isDark} onThemeChange={toggleTheme} />
      </div>

      <main id="main">
        <section className="homepage__hero" aria-labelledby="hero-title">
          <div className="homepage__container homepage__hero-grid">
            <div className="homepage__hero-copy">
              <p className="homepage__eyebrow text-b-s text-bold text__accent">
                <span className="homepage__status-dot" aria-hidden="true" />
                OPEN SOURCE. SELF HOSTED.
              </p>
              <h1 id="hero-title" className="homepage__intro text__display-intro">
                A self-hosted, highly configurable habit tracker.
              </h1>
              <p className="homepage__description text-b-xl text-light">
                Pick exactly how you want to track and view your habits, with different{' '}
                <a href="#habit-types" className="homepage__inline-link text__accent">
                  recording options
                </a>{' '}
                and{' '}
                <a href="#visualizations" className="homepage__inline-link text__accent">
                  data visualizations
                </a>{' '}
                for each.
              </p>
              <div className="homepage__actions">
                <GithubLink primary />
              </div>
              <a
                href={RELEASES_URL}
                className="homepage__release text-b-s text-light"
                aria-live="polite"
              >
                <span className="homepage__status-dot" aria-hidden="true" />
                {release ? (
                  <>
                    <span className="text-bold">{release.tag}</span>
                    <span aria-hidden="true">·</span>
                    Released{' '}
                    <time dateTime={release.publishedAt}>
                      {new Date(release.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </time>
                  </>
                ) : (
                  'See the latest release'
                )}
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
            <figure className="homepage__preview">
              <div className="homepage__preview-bar text-b-s text-light">
                <span className="homepage__window-dots" aria-hidden="true">
                  <i className="homepage__window-dot" />
                  <i className="homepage__window-dot" />
                  <i className="homepage__window-dot" />
                </span>
                Your daily dashboard
                <span className="homepage__preview-label">habsum</span>
              </div>
              <img
                className="homepage__dashboard"
                src={`${import.meta.env.BASE_URL}app-screenshot${screenshotSuffix}.png`}
                alt="Habsum dashboard with push-ups, reading, vitamins, and a journal, alongside habit graphs and a heatmap"
                width={isDark ? 1744 : 1748}
                height={isDark ? 1170 : 1160}
              />
            </figure>
          </div>
        </section>

        <div className="homepage__principles">
          <ul className="homepage__container homepage__principle-list text-b-m">
            {[
              'Self hosted',
              'GUI or YAML configuration',
              'Light & dark modes',
              'Multiple users',
            ].map((item) => (
              <li key={item} className="flex align-items-center gap-2">
                <Check size={15} className="text__accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <section
          id="habit-types"
          className="homepage__section homepage__container"
          aria-labelledby="habit-types-title"
        >
          <div className="homepage__section-heading">
            <div>
              <p className="homepage__eyebrow text-b-s text-bold text__accent">
                HABIT RECORDING OPTIONS
              </p>
              <h2 id="habit-types-title" className="text__display-heading">
                Different ways to record your habits.
              </h2>
            </div>
          </div>
          <div className="homepage__habit-grid">
            {habitTypes.map(({ name, icon: HabitIcon, description, habit }) => (
              <article key={name} className="homepage__habit">
                <div className="homepage__habit-heading">
                  <HabitIcon size={21} className="text__accent" aria-hidden="true" />
                  <h3 className="text-h-l">{name}</h3>
                </div>
                <p className="homepage__habit-description text-b-l text-light">{description}</p>
                <div className="homepage__habit-preview">
                  <HabitRecordingExample initialHabit={habit} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="visualizations"
          className="homepage__visualizations"
          aria-labelledby="visualizations-title"
        >
          <div className="homepage__container homepage__section">
            <div className="homepage__section-heading">
              <div>
                <p className="homepage__eyebrow text-b-s text-bold text__accent">
                  DATA VISUALIZATIONS
                </p>
                <h2 id="visualizations-title" className="text__display-heading">
                  Visualize your progress.
                </h2>
              </div>
            </div>
            <VisualizationExamples />
          </div>
        </section>

        <section
          className="homepage__container homepage__section homepage__configuration"
          aria-labelledby="configuration-title"
        >
          <div className="homepage__configuration-copy">
            <p className="homepage__eyebrow text-b-s text-bold text__accent">CONFIGURATION</p>
            <h2 id="configuration-title" className="text__display-heading">
              Easy to configure.
            </h2>
            <p className="text-b-xl text-light">
              Configure habits, goals, schedules, and visualizations through the GUI, or edit the
              YAML file directly.
            </p>
          </div>
          <div className="homepage__configuration-previews">
            <figure className="homepage__preview homepage__configuration-window homepage__configuration-window--gui">
              <div className="homepage__preview-bar text-b-s text-light">
                <span className="homepage__window-dots" aria-hidden="true">
                  <i className="homepage__window-dot" />
                  <i className="homepage__window-dot" />
                  <i className="homepage__window-dot" />
                </span>
                Habit editor
                <span className="homepage__preview-label">habsum</span>
              </div>
              <img
                className="homepage__configuration-screenshot"
                src={`${import.meta.env.BASE_URL}gui-config${screenshotSuffix}.png`}
                alt="Habsum visual configuration editor with a goal, quick-add options, and configurable habit widgets"
                width={isDark ? 1142 : 1144}
                height="1100"
                loading="lazy"
              />
            </figure>
            <figure className="homepage__preview homepage__configuration-window homepage__configuration-window--yaml">
              <div className="homepage__preview-bar text-b-s text-light">
                <span className="homepage__window-dots" aria-hidden="true">
                  <i className="homepage__window-dot" />
                  <i className="homepage__window-dot" />
                  <i className="homepage__window-dot" />
                </span>
                config.yaml
                <span className="homepage__preview-label">habsum</span>
              </div>
              <img
                className="homepage__configuration-screenshot"
                src={`${import.meta.env.BASE_URL}yaml-config${screenshotSuffix}.png`}
                alt="The same habits configured in a plain YAML file"
                width={isDark ? 1248 : 1262}
                height="940"
                loading="lazy"
              />
            </figure>
          </div>
        </section>
      </main>

      <footer className="homepage__container homepage__footer text-b-s text-light">
        <a href="#top" className="homepage__footer-brand text-h-m">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} width="24" height="24" alt="" />
          Habsum
        </a>
        <nav className="homepage__footer-links" aria-label="Footer navigation">
          <a className="text-light" href={GITHUB_URL}>
            GitHub
          </a>
          <a className="text-light" href={DOCS_URL}>
            Docs
          </a>
          <a className="text-light" href={`${GITHUB_URL}/blob/main/LICENSE`}>
            License
          </a>
        </nav>
      </footer>
    </div>
  );
}
