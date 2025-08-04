/**
 * CommentSold API Client for Remix
 * Adapted from the clean TypeScript implementation
 */

// Types and Interfaces
interface MediaItem {
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string;
  [key: string]: any;
}

interface VideoInfo {
  url: string;
  thumbnail: string;
  type: string;
}

interface InventoryItem {
  [key: string]: any;
}

interface ShopTheLookItem {
  [key: string]: any;
}

// CommentSold Product Class
export class CommentSoldProduct {
  public productId: number;
  public postId: number;
  public createdAt: number;
  public productName: string;
  public description: string;
  public quantity: number;
  public price: number = 0.0;
  public productType?: string;
  public style?: string;
  public thumbnail?: string;
  public filename?: string;
  public imageWidth?: number;
  public imageHeight?: number;
  public inventory: InventoryItem[] = [];
  public hasVideo: boolean = false;
  public videoUrl?: string;
  public isShopTheLook: boolean = false;
  public shopTheLook: ShopTheLookItem[] = [];
  public liveId?: number;
  public badgeLabel?: string;
  public strikethroughLabel?: string;
  public priceLabel?: string;
  public allowWaitlist: boolean = false;
  public rawData?: Record<string, any>;
  // Enhanced fields from individual product API
  public extraMedia: MediaItem[] = [];
  public videos: MediaItem[] = [];
  public storeDescription?: string;
  public featuredInLive: boolean = false;

  constructor(data: Record<string, any>) {
    this.productId = data.product_id || 0;
    this.postId = data.post_id || 0;
    this.createdAt = data.created_at || 0;
    this.productName = data.product_name || "";
    this.description = data.description || "";
    this.quantity = data.quantity || 0;
    this.productType = data.product_type;
    this.style = data.style;
    this.thumbnail = data.thumbnail;
    this.filename = data.filename;
    this.imageWidth = data.image_width;
    this.imageHeight = data.image_height;
    this.inventory = data.inventory || [];
    this.hasVideo = data.has_video || false;
    this.videoUrl = data.video_url;
    this.isShopTheLook = data.is_shop_the_look || false;
    this.shopTheLook = data.shop_the_look || [];
    this.liveId = data.live_id;
    this.badgeLabel = data.badge_label;
    this.strikethroughLabel = data.strikethrough_label;
    this.priceLabel = data.price_label;
    this.allowWaitlist = data.allow_waitlist || false;
    this.rawData = data;
    // Enhanced fields
    this.extraMedia = data.extra_media || [];
    this.videos = data.videos || [];
    this.storeDescription = data.store_description;
    this.featuredInLive = data.featured_in_live || false;

    // Extract price from price_label if available
    this.extractPriceFromLabel();
  }

  private extractPriceFromLabel(): void {
    if (this.priceLabel && this.price === 0.0) {
      try {
        // Extract price from label like "56!" or "$56"
        const priceStr = this.priceLabel.replace(/[$!]/g, "").trim();
        this.price = parseFloat(priceStr);
      } catch (error) {
        // Keep price as 0.0 if parsing fails
      }
    }
  }

  get createdDateTime(): Date {
    return new Date(this.createdAt * 1000);
  }

  get imageUrl(): string | undefined {
    // Use extra_media if available, otherwise fallback to filename/thumbnail
    if (this.extraMedia.length > 0) {
      // Find the first non-video media item
      for (const media of this.extraMedia) {
        if (media.media_type !== "static" || !media.media_url) {
          continue;
        }
        // Skip if it's a video (has thumbnail_url but media_url doesn't end with image extension)
        const mediaUrl = media.media_url || "";
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        if (
          !imageExtensions.some((ext) => mediaUrl.toLowerCase().endsWith(ext))
        ) {
          continue;
        }
        return mediaUrl;
      }
    }
    return this.filename || this.thumbnail;
  }

  get allImageUrls(): string[] {
    const mediaUrls: string[] = [];
    if (this.extraMedia.length > 0) {
      for (const media of this.extraMedia) {
        const mediaUrl = media.media_url || "";
        if (mediaUrl) {
          mediaUrls.push(mediaUrl);
        }
      }
    }
    // Fallback to filename/thumbnail if no extra_media
    if (mediaUrls.length === 0) {
      if (this.filename) {
        mediaUrls.push(this.filename);
      } else if (this.thumbnail) {
        mediaUrls.push(this.thumbnail);
      }
    }
    return mediaUrls;
  }

  get allVideoUrls(): VideoInfo[] {
    const videoInfo: VideoInfo[] = [];
    if (this.videos.length > 0) {
      for (const video of this.videos) {
        videoInfo.push({
          url: video.media_url || "",
          thumbnail: video.thumbnail_url || "",
          type: video.media_type || "video",
        });
      }
    }
    return videoInfo;
  }

  get isInStock(): boolean {
    return this.quantity > 0;
  }
}

// CommentSold Collection Class
export class CommentSoldCollection {
  public id: number;
  public title: string;
  public position: number;
  public collectionSlug: string;
  public image?: string;

  constructor(data: Record<string, any>) {
    this.id = data.id || 0;
    this.title = data.title || "";
    this.position = data.position || 0;
    this.collectionSlug = data.collection_slug || "";
    this.image = data.image;
  }
}

// CommentSold Live Sale Class
export class CommentSoldLiveSale {
  public id: number;
  public name: string;
  public sourceUrl?: string;
  public sourceThumb?: string;
  public animatedThumb?: string;
  public startedAt: number;
  public endedAt?: number;
  public productCount: number;
  public peakViewers: number;
  public isLive: boolean;
  public label?: string;
  public isWideCell: boolean;
  public products: CommentSoldLiveSaleProduct[];

  constructor(data: Record<string, any>) {
    this.id = data.id || 0;
    this.name = data.name || "";
    this.sourceUrl = data.source_url;
    this.sourceThumb = data.source_thumb;
    this.animatedThumb = data.animated_thumb;
    this.startedAt = data.started_at || 0;
    this.endedAt = data.ended_at;
    this.productCount = data.product_count || 0;
    this.peakViewers = data.peak_viewers || 0;
    this.isLive = data.is_live || false;
    this.label = data.label;
    this.isWideCell = data.is_wide_cell || false;
    this.products = [];
  }

  get startedAtDate(): Date {
    return new Date(this.startedAt * 1000);
  }

  get endedAtDate(): Date | null {
    return this.endedAt ? new Date(this.endedAt * 1000) : null;
  }
}

// CommentSold Live Sale Product Class
export class CommentSoldLiveSaleProduct {
  public id: number;
  public productId: number;
  public productName: string;
  public brand?: string;
  public identifier?: string;
  public thumbnail?: string;
  public price: number;
  public priceLabel?: string;
  public quantity: number;
  public badgeLabel?: string;
  public shownAt?: number;
  public hiddenAt?: number;
  public isFavorite: boolean;
  public description?: string;
  public storeDescription?: string;
  public productPath?: string;
  public externalId?: string;
  public productType?: string;
  public attr1DisplayName?: string;
  public attr2DisplayName?: string;
  public attr3DisplayName?: string;
  public shopifyProductId?: string;
  public media: MediaItem[];
  public overlayTexts: string[];
  public inventory: InventoryItem[];

  constructor(data: Record<string, any>) {
    this.id = data.id || 0;
    this.productId = data.product_id || 0;
    this.productName = data.product_name || "";
    this.brand = data.brand;
    this.identifier = data.identifier;
    this.thumbnail = data.thumbnail;
    this.price = data.price || 0;
    this.priceLabel = data.price_label;
    this.quantity = data.quantity || 0;
    this.badgeLabel = data.badge_label;
    this.shownAt = data.shown_at;
    this.hiddenAt = data.hidden_at;
    this.isFavorite = data.is_favorite || false;
    this.description = data.description;
    this.storeDescription = data.store_description;
    this.productPath = data.product_path;
    this.externalId = data.external_id;
    this.productType = data.product_type;
    this.attr1DisplayName = data.attr_1_display_name;
    this.attr2DisplayName = data.attr_2_display_name;
    this.attr3DisplayName = data.attr_3_display_name;
    this.shopifyProductId = data.shopify_product_id;
    this.media = data.media || [];
    this.overlayTexts = data.overlay_texts || [];
    this.inventory = data.inventory || [];
  }

  get shownAtDate(): Date | null {
    return this.shownAt ? new Date(this.shownAt * 1000) : null;
  }

  get hiddenAtDate(): Date | null {
    return this.hiddenAt ? new Date(this.hiddenAt * 1000) : null;
  }
}

// CommentSold Response Class
export class CommentSoldResponse {
  public products: CommentSoldProduct[];
  public liveVideo?: Record<string, any>;
  public banner?: Record<string, any>;
  public total: number;

  constructor(
    products: CommentSoldProduct[],
    liveVideo?: Record<string, any>,
    banner?: Record<string, any>,
    total?: number,
  ) {
    this.products = products;
    this.liveVideo = liveVideo;
    this.banner = banner;
    this.total = total || 0;
  }
}

// API Client Class
export class CommentSoldAPI {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = "https://api.commentsold.com/api/2.0/divas") {
    this.baseUrl = baseUrl;
    this.headers = {
      "User-Agent": "CommentSold-Shopify-Transfer/1.0",
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async getCollections(): Promise<CommentSoldCollection[]> {
    const url = `${this.baseUrl}/collections`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as Record<string, any>;
      const collections: CommentSoldCollection[] = [];

      if (Array.isArray(data)) {
        for (const collectionData of data) {
          const collection = new CommentSoldCollection(collectionData);
          collections.push(collection);
        }
      }

      return collections;
    } catch (error) {
      console.error(`Collections API request failed: ${error}`);
      return [];
    }
  }

  async getProducts(
    lastPostId?: number,
    collectionId?: number,
  ): Promise<CommentSoldResponse> {
    const url = new URL(`${this.baseUrl}/products/find`);

    if (lastPostId) {
      url.searchParams.append("last_post_id", lastPostId.toString());
    }

    if (collectionId) {
      url.searchParams.append("collection_ids", collectionId.toString());
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as Record<string, any>;
      return this.parseResponse(data);
    } catch (error) {
      console.error(`API request failed: ${error}`);
      return new CommentSoldResponse([]);
    }
  }

  async getProductDetails(
    productId: number,
  ): Promise<CommentSoldProduct | null> {
    const url = `${this.baseUrl}/products/${productId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as Record<string, any>;

      // Individual product API returns array with one item
      if (Array.isArray(data) && data.length > 0) {
        return this.parseProductDetails(data[0]);
      } else {
        console.error(`Unexpected response format for product ${productId}`);
        return null;
      }
    } catch (error) {
      console.error(
        `Failed to fetch product details for ${productId}: ${error}`,
      );
      return null;
    }
  }

  private parseResponse(data: Record<string, any>): CommentSoldResponse {
    const products: CommentSoldProduct[] = [];

    if (data.products && Array.isArray(data.products)) {
      for (const productData of data.products) {
        const product = this.parseProduct(productData);
        products.push(product);
      }
    }

    return new CommentSoldResponse(
      products,
      data.live_video,
      data.banner,
      data.total || products.length,
    );
  }

  private parseProduct(productData: Record<string, any>): CommentSoldProduct {
    return new CommentSoldProduct(productData);
  }

  private parseProductDetails(
    productData: Record<string, any>,
  ): CommentSoldProduct {
    return new CommentSoldProduct(productData);
  }

  async getAllProductsFromCollection(
    collectionId: number,
    limit?: number,
  ): Promise<CommentSoldProduct[]> {
    const allProducts: CommentSoldProduct[] = [];
    let lastPostId: number | undefined;

    while (true) {
      const response = await this.getProducts(lastPostId, collectionId);

      if (response.products.length === 0) {
        break;
      }

      allProducts.push(...response.products);

      // Check if we've reached the limit
      if (limit && allProducts.length >= limit) {
        return allProducts.slice(0, limit);
      }

      // Get the last post_id for pagination
      lastPostId = response.products[response.products.length - 1].postId;

      // If we got less than expected, we might be at the end
      if (response.products.length < 10) {
        // Assuming 10 is the default page size
        break;
      }
    }

    return allProducts;
  }

  async getProductsWithCollectionInfo(
    collections: CommentSoldCollection[],
    productsPerCollection?: number,
  ): Promise<
    Record<
      number,
      { product: CommentSoldProduct; collections: CommentSoldCollection[] }
    >
  > {
    const productCollectionMap: Record<
      number,
      { product: CommentSoldProduct; collections: CommentSoldCollection[] }
    > = {};

    for (const collection of collections) {
      const limitText = productsPerCollection
        ? ` (limit: ${productsPerCollection})`
        : " (all products)";
      console.log(
        `📥 Fetching products from collection: ${collection.title} (ID: ${collection.id})${limitText}`,
      );

      const products = await this.getAllProductsFromCollection(
        collection.id,
        productsPerCollection,
      );
      console.log(
        `✅ Got ${products.length} products from ${collection.title}`,
      );

      for (const product of products) {
        if (!(product.productId in productCollectionMap)) {
          productCollectionMap[product.productId] = {
            product: product,
            collections: [],
          };
        }
        productCollectionMap[product.productId].collections.push(collection);
      }
    }

    return productCollectionMap;
  }

  async getLiveSales(): Promise<CommentSoldLiveSale[]> {
    const url = `${this.baseUrl}/live-sales`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as Record<string, any>;
      const liveSales: CommentSoldLiveSale[] = [];

      if (Array.isArray(data)) {
        for (const liveSaleData of data) {
          const liveSale = new CommentSoldLiveSale(liveSaleData);
          liveSales.push(liveSale);
        }
      } else if (data && typeof data === 'object') {
        // Check common nested patterns
        if (data.live_sales && Array.isArray(data.live_sales)) {
          for (const liveSaleData of data.live_sales) {
            const liveSale = new CommentSoldLiveSale(liveSaleData);
            liveSales.push(liveSale);
          }
        } else if (data.data && Array.isArray(data.data)) {
          for (const liveSaleData of data.data) {
            const liveSale = new CommentSoldLiveSale(liveSaleData);
            liveSales.push(liveSale);
          }
        }
      }

      return liveSales;
    } catch (error) {
      console.error(`Live Sales API request failed: ${error}`);
      return [];
    }
  }

  async getLiveSaleDetails(liveSaleId: number): Promise<CommentSoldLiveSale | null> {
    const url = `${this.baseUrl}/live-sales/${liveSaleId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as Record<string, any>;

      if (data && typeof data === 'object') {
        const liveSale = new CommentSoldLiveSale(data);
        
        // Parse products if they exist
        if (data.products && Array.isArray(data.products)) {
          for (const productData of data.products) {
            const product = new CommentSoldLiveSaleProduct(productData);
            liveSale.products.push(product);
          }
        }

        return liveSale;
      } else {
        console.error(`Unexpected response format for live sale ${liveSaleId}`);
        return null;
      }
    } catch (error) {
      console.error(`Failed to fetch live sale details for ${liveSaleId}: ${error}`);
      return null;
    }
  }

  async getLiveSalesWithDetails(limit?: number): Promise<CommentSoldLiveSale[]> {
    // First get all live sales
    const liveSales = await this.getLiveSales();
    
    // Limit the number of live sales if specified
    const limitedLiveSales = limit ? liveSales.slice(0, limit) : liveSales;
    
    // Fetch details for each live sale
    const liveSalesWithDetails: CommentSoldLiveSale[] = [];
    
    for (const liveSale of limitedLiveSales) {
      console.log(`📥 Fetching details for live sale: ${liveSale.name} (ID: ${liveSale.id})`);
      
      const detailedLiveSale = await this.getLiveSaleDetails(liveSale.id);
      if (detailedLiveSale) {
        liveSalesWithDetails.push(detailedLiveSale);
        console.log(`✅ Got ${detailedLiveSale.products.length} products from live sale: ${detailedLiveSale.name}`);
      } else {
        console.log(`❌ Failed to get details for live sale: ${liveSale.name}`);
        // Add the basic live sale without products
        liveSalesWithDetails.push(liveSale);
      }
    }
    
    return liveSalesWithDetails;
  }
}