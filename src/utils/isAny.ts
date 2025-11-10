export type IsAny<T> = unknown extends T
    ? [keyof T] extends [never]
        ? false
        : true
    : false;
