import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiSearch } from './ai-search';

describe('AiSearch', () => {
  let component: AiSearch;
  let fixture: ComponentFixture<AiSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
