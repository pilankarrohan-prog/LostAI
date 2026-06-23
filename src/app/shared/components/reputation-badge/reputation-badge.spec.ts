import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReputationBadge } from './reputation-badge';

describe('ReputationBadge', () => {
  let component: ReputationBadge;
  let fixture: ComponentFixture<ReputationBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReputationBadge]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReputationBadge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
