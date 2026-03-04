const { BskyAgent } = require('@atproto/api');
const db = require('../config/firebase');

class BlueskyMonitor {
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
    
    this.handle = this.credentials.identifier;
    if (this.handle.includes('@')) {
      this.handle = this.handle.split('@')[0];
    }
    
    // Reference for storing last checked timestamps in Realtime Database
    this.timestampRef = db.ref('blueskyMonitor/lastChecked');
    
    // Store the callbacks for different event types
    this.eventCallbacks = {
      mention: [],
      reply: [],
      quote: [],
      repost: [],
      follow: [],
      like: []
    };
    
    // Track seen notifications to avoid duplicates
    this.seenNotifications = new Set();
    
    // Default lastChecked values; these will be updated after loading from the DB
    this.lastChecked = {
      notifications: new Date().toISOString(),
      mentions: new Date().toISOString()
    };
    this.loadLastChecked();
  }
  
  // Load the last checked timestamps from Firebase Realtime Database
  async loadLastChecked() {
    try {
      const snapshot = await this.timestampRef.once('value');
      let data = snapshot.val();
      if (!data) {
        data = {
          notifications: new Date().toISOString(),
          mentions: new Date().toISOString()
        };
        await this.timestampRef.set(data);
      }
      this.lastChecked = data;
      return data;
    } catch (error) {
      console.error('Error loading last checked timestamps:', error);
      return this.lastChecked;
    }
  }
  
  // Save the last checked timestamps to Firebase Realtime Database
  async saveLastChecked() {
    try {
      await this.timestampRef.set(this.lastChecked);
    } catch (error) {
      console.error('Error saving last checked timestamps:', error);
    }
  }
  
  // Login to Bluesky
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
  
  // Register a callback for a specific event type
  on(eventType, callback) {
    if (this.eventCallbacks[eventType]) {
      this.eventCallbacks[eventType].push(callback);
      return true;
    }
    return false;
  }
  
  // Process notifications and trigger callbacks
  async processNotifications(notifications) {
    for (const notification of notifications) {
      // Skip if we've already seen this notification
      if (this.seenNotifications.has(notification.uri)) continue;
      
      this.seenNotifications.add(notification.uri);
      
      // Trigger appropriate callbacks based on notification reason
      switch (notification.reason) {
        case 'mention':
          for (const callback of this.eventCallbacks.mention) {
            await callback(notification);
          }
          break;
        case 'reply':
          for (const callback of this.eventCallbacks.reply) {
            await callback(notification);
          }
          break;
        case 'quote':
          for (const callback of this.eventCallbacks.quote) {
            await callback(notification);
          }
          break;
        case 'repost':
          for (const callback of this.eventCallbacks.repost) {
            await callback(notification);
          }
          break;
        case 'follow':
          for (const callback of this.eventCallbacks.follow) {
            await callback(notification);
          }
          break;
        case 'like':
          for (const callback of this.eventCallbacks.like) {
            await callback(notification);
          }
          break;
      }
    }
    
    // Limit the size of seenNotifications to avoid memory bloat
    if (this.seenNotifications.size > 1000) {
      this.seenNotifications = new Set(
        Array.from(this.seenNotifications).slice(-500)
      );
    }
  }
  
  // Check for new notifications
  async checkNotifications() {
    try {
      const isLoggedIn = await this.login('checking notifications');
      if (!isLoggedIn) return [];
      
      const { data } = await this.agent.listNotifications({ limit: 50 });
      if (!data.notifications || data.notifications.length === 0) return [];
      
      // Filter notifications newer than the last checked timestamp
      const newNotifications = data.notifications.filter(notification => {
        return new Date(notification.indexedAt) > new Date(this.lastChecked.notifications);
      });
      
      // Update the last checked timestamp with the latest notification's time
      if (data.notifications.length > 0) {
        const latestTimestamp = new Date(data.notifications[0].indexedAt).toISOString();
        this.lastChecked.notifications = latestTimestamp;
        await this.saveLastChecked();
      }
      
      await this.processNotifications(newNotifications);
      return newNotifications;
    } catch (error) {
      console.error('Error checking Bluesky notifications:', error);
      return [];
    }
  }
  
  // Search for mentions that might not appear in notifications
  async searchMentions() {
    try {
      const isLoggedIn = await this.login('searching mentions');
      if (!isLoggedIn) return [];
      
      const { data } = await this.agent.app.bsky.feed.searchPosts({
        q: `@${this.handle}`,
        limit: 30
      });
      
      if (!data.posts || data.posts.length === 0) return [];
      
      // Filter posts (mentions) newer than the last checked mentions timestamp
      const newMentions = data.posts.filter(post => {
        return new Date(post.indexedAt) > new Date(this.lastChecked.mentions);
      });
      
      if (newMentions.length > 0) {
        const latestTimestamp = new Date(data.posts[0].indexedAt).toISOString();
        this.lastChecked.mentions = latestTimestamp;
        await this.saveLastChecked();
        
        // Convert posts into notification-like format
        const formattedMentions = newMentions.map(post => ({
          uri: post.uri,
          cid: post.cid,
          author: post.author,
          reason: 'mention',
          record: post.record,
          isRead: false,
          indexedAt: post.indexedAt
        }));
        
        await this.processNotifications(formattedMentions);
      }
      
      return newMentions;
    } catch (error) {
      console.error('Error searching Bluesky mentions:', error);
      return [];
    }
  }
  
  // Start monitoring Bluesky at regular intervals
  startMonitoring(interval = 60000) {
    // Initial checks
    this.checkNotifications().then(notifications => {
      if (notifications.length > 0) {
        console.log(`Found ${notifications.length} new Bluesky notifications`);
      }
    });
    
    this.searchMentions().then(mentions => {
      if (mentions.length > 0) {
        console.log(`Found ${mentions.length} new Bluesky mentions`);
      }
    });
    
    // Set up interval-based checks
    this.notificationsInterval = setInterval(() => {
      this.checkNotifications().then(notifications => {
        if (notifications.length > 0) {
          console.log(`Found ${notifications.length} new Bluesky notifications`);
        }
      });
    }, interval);
    
    this.mentionsInterval = setInterval(() => {
      this.searchMentions().then(mentions => {
        if (mentions.length > 0) {
          console.log(`Found ${mentions.length} new Bluesky mentions`);
        }
      });
    }, interval * 2);
    
    console.log(`Started monitoring Bluesky for @${this.handle} every ${interval/1000} seconds`);
  }
  
  // Stop monitoring
  stopMonitoring() {
    if (this.notificationsInterval) clearInterval(this.notificationsInterval);
    if (this.mentionsInterval) clearInterval(this.mentionsInterval);
    console.log('Stopped monitoring Bluesky');
  }
}

module.exports = BlueskyMonitor;
