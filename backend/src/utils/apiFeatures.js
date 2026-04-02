'use strict';

class APIFeatures {
  /**
   * @param {mongoose.Query} query - Mongoose query object
   * @param {Object} queryString - Express req.query
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'admin'];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Advanced filtering: price[gte]=100&price[lte]=500 => {price: {$gte: 100, $lte: 500}}
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    const parsedQuery = JSON.parse(queryStr);

    // Category filter (by slug or ID)
    if (parsedQuery.category) {
      // Category slug will be resolved in the controller via populate/lookup
      // Here we accept both ObjectId and slug string
    }

    // Brand filter (case-insensitive)
    if (parsedQuery.brand) {
      parsedQuery.brand = { $regex: new RegExp(parsedQuery.brand, 'i') };
    }

    // isActive filter: always show active products to non-admins
    if (parsedQuery.isActive === undefined) {
      parsedQuery.isActive = true;
    }

    this.query = this.query.find(parsedQuery);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortMap = {
        'price-asc': 'price',
        'price-desc': '-price',
        'rating': '-ratings',
        'newest': '-createdAt',
        'oldest': 'createdAt',
        'popular': '-numReviews',
        'discount': '-discountPrice',
      };

      const sortBy = sortMap[this.queryString.sort] || this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      // Exclude internal version field by default
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = Math.max(parseInt(this.queryString.page, 10) || 1, 1);
    const limit = Math.min(parseInt(this.queryString.limit, 10) || 12, 100);
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    this.page = page;
    this.limit = limit;
    return this;
  }

  search(fields = ['name', 'description', 'brand', 'tags']) {
    if (this.queryString.search) {
      const searchRegex = new RegExp(this.queryString.search, 'i');
      const searchConditions = fields.map((field) => ({ [field]: searchRegex }));
      this.query = this.query.find({ $or: searchConditions });
    }
    return this;
  }
}

module.exports = APIFeatures;
