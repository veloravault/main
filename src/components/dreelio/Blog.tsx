import Image from "next/image";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Blog.module.css";
import { BLOG_POSTS, FEATURED_POST } from "./data";

const TAG_COLOR = {
  blue: "var(--pill-blue)",
  amber: "var(--pill-amber)",
  green: "var(--pill-green)",
} as const;

export function Blog() {
  return (
    <section id="blog" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <div className={shared.sectionHead}>
          <p className={shared.eyebrow}>Blog</p>
          <h2 className={shared.h2}>
            Ideas to help you
            <br />
            stay secure
          </h2>
        </div>

        {/* featured */}
        <a href="#" className={styles.featured}>
          <div className={styles.featuredImg}>
            <Image
              src={FEATURED_POST.image}
              alt=""
              width={800}
              height={720}
              sizes="(max-width: 900px) 100vw, 500px"
            />
          </div>
          <div className={styles.featuredBody}>
            <span className={styles.mustRead}>{FEATURED_POST.tag}</span>
            <h3 className={styles.featuredTitle}>{FEATURED_POST.title}</h3>
            <p className={styles.featuredExcerpt}>{FEATURED_POST.excerpt}</p>
            <div className={styles.featuredFoot}>
              <div className={styles.author}>
                <Image src="/brand/velora-mark-light.png" alt={FEATURED_POST.author} width={40} height={40} className={styles.authorAvatar} />
                <span>
                  <span className={styles.authorName}>{FEATURED_POST.author}</span>
                  <span className={styles.authorRole}>{FEATURED_POST.role}</span>
                </span>
              </div>
              <span className={`${shared.tag} ${styles.featuredBadge}`}>{FEATURED_POST.badge}</span>
            </div>
          </div>
        </a>

        {/* grid */}
        <div className={styles.grid}>
          {BLOG_POSTS.map((post) => (
            <a href="#" key={post.title} className={styles.post}>
              <div className={styles.postImg}>
                <Image src={post.image} alt="" width={440} height={300} sizes="(max-width: 900px) 100vw, 380px" />
              </div>
              <div className={styles.postFoot}>
                <h4 className={styles.postTitle}>{post.title}</h4>
                <span className={shared.tag} style={{ background: TAG_COLOR[post.tagColor] }}>
                  {post.tag}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
