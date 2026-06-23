import { TestBed } from '@angular/core/testing';

import { AiSearch } from './ai-search';

describe('AiSearch', () => {
  let service: AiSearch;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiSearch);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
