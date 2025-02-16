// ChainIt.js


class ChainIt {
    posts = []; // Liste des posts { id, author, title, content, timestamp, comments }

    postThread(title, content) /* write */ {
        asserts(title.length > 0, "Le titre ne peut pas être vide");
        asserts(content.length > 0, "Le contenu ne peut pas être vide");

        const sender = lower(caller);
        const id = this.posts.length.toString(); // ID basé sur l'index du post

        this.posts.push({
            id,
            author: sender,
            title,
            content,
            timestamp: Date.now(),
            comments: [] // Liste des commentaires
        });
    }


    commentThread(postId, comment) /* write */ {
        asserts(comment.length > 0, "Commentaire vide interdit");
        const sender = lower(caller);

        const post = this.posts.find(p => p.id === postId);
        asserts(post, "Post introuvable");

        post.comments.push({
            author: sender,
            comment,
            timestamp: Date.now()
        });
    }


    getLastPosts(maxPosts = "100", offset = "0") {
        offset = Number(offset) || 0;
        maxPosts = Number(maxPosts) || 100;

        const posts = [...this.posts].reverse();
        return posts.slice(offset, maxPosts) || [];
    }
}

