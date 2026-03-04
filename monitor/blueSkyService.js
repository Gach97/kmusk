const { BskyAgent } = require('@atproto/api');
const fs = require('fs');
const path = require('path');

class BlueskyService {
  constructor(config = {}) {
    this.agent = new BskyAgent({
      service: config.service || 'https://bsky.social',
    });
    
    this.credentials = {
      identifier: process.env.BLUESKY_IDENTIFIER || config.identifier,
      password: process.env.BLUESKY_PASSWORD || config.password
    };
    
    // Validate that identifier is provided
    if (!this.credentials.identifier) {
      throw new Error(
        'Missing BLUESKY_IDENTIFIER environment variable. ' +
        'Please set BLUESKY_IDENTIFIER in your .env file (e.g., your Bluesky handle without @)'
      );
    }
    
    // Validate that password is provided
    if (!this.credentials.password) {
      throw new Error(
        'Missing BLUESKY_PASSWORD environment variable. ' +
        'Please set BLUESKY_PASSWORD in your .env file'
      );
    }
    
    // Track posts we've made
    this.postsLogPath = path.join(__dirname, 'bluesky_posts_log.json');
    // this.postsLog = this.loadPostsLog();
  }
  
  // loadPostsLog() {
  //   try {
  //     if (fs.existsSync(this.postsLogPath)) {
  //       const data = fs.readFileSync(this.postsLogPath, 'utf8');
  //       return JSON.parse(data);
  //     } else {
  //       const initialLog = { posts: [] };
  //       fs.writeFileSync(this.postsLogPath, JSON.stringify(initialLog, null, 2));
  //       return initialLog;
  //     }
  //   } catch (error) {
  //     console.error('Error loading Bluesky posts log:', error);
  //     return { posts: [] };
  //   }
  // }
  
  // savePostsLog() {
  //   try {
  //     fs.writeFileSync(this.postsLogPath, JSON.stringify(this.postsLog, null, 2));
  //   } catch (error) {
  //     console.error('Error saving Bluesky posts log:', error);
  //   }
  // }
  
  async login(where) {
    try {
      await this.agent.login(this.credentials);
      console.log(`Logged in to Bluesky as ${this.credentials.identifier} while ${where}`);
      return true;
    } catch (error) {
      console.error('Bluesky login error:', error);
      return false;
    }
  }
  
  // Post a new skeet (Bluesky post)
  async postSkeet(text, options = {}) {
    try {
      const isLoggedIn = await this.login('posting');
      if (!isLoggedIn) {
        throw new Error('Failed to login to Bluesky');
      }
      
      // Prepare post content
      const postParams = {
        text: text,
        langs: ['en'],
        ...options
      };
      
      // If this is a reply, add the reference
      if (options.replyTo) {
        postParams.reply = {
          root: options.replyTo.root || options.replyTo.uri,
          parent: options.replyTo.uri
        };
      }
      
      // Make the post
      const response = await this.agent.post(postParams);
      
      // Log the post
      // this.postsLog.posts.push({
      //   cid: response.cid,
      //   uri: response.uri,
      //   text: text,
      //   timestamp: new Date().toISOString(),
      //   isReply: !!options.replyTo,
      //   replyTo: options.replyTo || null
      // });
      
      // Keep log size reasonable
      // if (this.postsLog.posts.length > 100) {
      //   this.postsLog.posts = this.postsLog.posts.slice(-100);
      // }
      
      // this.savePostsLog();
      
      return {
        success: true,
        cid: response.cid,
        uri: response.uri
      };
    } catch (error) {
      console.error('Error posting to Bluesky:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Reply to a post
  async replyToPost(postUri, replyText) {
    try {
      const isLoggedIn = await this.login('replying');
      if (!isLoggedIn) {
        throw new Error('Failed to login to Bluesky');
      }
      
      // Get the post to reply to
      const { data: postData } = await this.agent.getPost({ uri: postUri });
      
      if (!postData || !postData.post) {
        throw new Error('Could not find the post to reply to');
      }
      
      // Get the reply options
      const replyOptions = {
        replyTo: {
          uri: postData.post.uri,
          cid: postData.post.cid,
          root: postData.post.value.reply ? postData.post.value.reply.root : postData.post
        }
      };
      
      // Post the reply
      return await this.postSkeet(replyText, replyOptions);
    } catch (error) {
      console.error('Error replying to Bluesky post:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get profile information for a user
  async getProfile(handle) {
    try {
      const isLoggedIn = await this.login('getting profile');
      if (!isLoggedIn) {
        throw new Error('Failed to login to Bluesky');
      }
      
      const { data } = await this.agent.getProfile({ actor: handle });
      return data;
    } catch (error) {
      console.error('Error getting Bluesky profile:', error);
      return null;
    }
  }
}

module.exports = BlueskyService;
