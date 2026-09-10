import "../about.css";

export default function About() {
  return (
    <main className="main">
      <section className="about-context span-12">
        <div className="about-text">
          <h2 className="text-headline-1">
            Designing for Impact &amp; Clarity
          </h2>
          <p className="text-base">
            I&apos;m a Product Designer who believes great design is rooted in
            clarity, function, and solving real user problems. With a background
            in creative storytelling, mixed media, and complex digital
            interfaces, I&apos;m fascinated by how emerging tech, from AI to
            spatial computing, will reshape how we interact with software and
            physical systems.
          </p>

          <p className="text-base">
            I take an outcome-driven approach to product development. My
            experience has shown that users give the most valuable feedback when
            they can react to something tangible rather than abstract ideas. By
            grounding hypotheses in rapid, testable prototypes, I help teams
            move from assumptions to validated, business-aligned solutions
            efficiently.
          </p>
          <a
            href="mailto:ux.dibyajeet@gmail.com"
            className="about-email text-headline-2"
          >
            ux.dibyajeet@gmail.com
          </a>
          <div className="about-buttons">
            <a
              href="/about/resume.pdf"
              className="about-link"
              download="Dibyajeet_Kirttania_Resume.pdf"
            >
              <i className="bi bi-box-arrow-in-down" aria-hidden="true" />{" "}
              resume
            </a>
            <a
              href="https://www.linkedin.com/in/dibyajeetk/"
              className="about-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-linkedin" aria-hidden="true" /> linkedin
            </a>
            <a
              href="https://www.instagram.com/97ronen/"
              className="about-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-instagram" aria-hidden="true" /> instagram
            </a>
          </div>
        </div>
        <img
          src="/about/display-photo.jpg"
          alt="Dibyajeet Kirttania"
          className="about-photo"
          width={500}
          height={500}
        />
      </section>

      <section className="about-hobbies span-12">
        <h2 className="text-headline-1">When I am not working</h2>
        <p className="text-base">
          I could be seen riding my motorcycle down the mountain roads.
          Exploring nature helps me wind down, and meeting new people and
          exploring diverse cultures helps me expand my knowledge.
        </p>
        <div className="about-photos">
          <figure className="about-frame">
            <img
              src="/about/moto-one.jpg"
              alt="Off-road trail exploration at Burundi Dam, Jharkhand, India"
            />
            <figcaption className="text-caption">
              Off-road trail exploration at Burundi Dam. Jharkhand, India
            </figcaption>
          </figure>
          <figure className="about-frame">
            <img
              src="/about/moto-two.jpg"
              alt="Trip to Yuksom, Sikkim"
            />
            <figcaption className="text-caption">
              1600 Kms ride from home to the wilderness of Sikkim, India.
            </figcaption>
          </figure>
          <figure className="about-frame">
            <img
              src="/about/moto-three.jpg"
              alt="Off-road trail riding at Damodar River bank, Durgapur, India"
            />
            <figcaption className="text-caption">
              Practicing sand riding skills at the banks of Damodar River.
              Durgapur, India
            </figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}