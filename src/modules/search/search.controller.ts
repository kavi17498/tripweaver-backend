import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { ComprehensiveSearchQueryDto } from './dto/comprehensive-search-query.dto';
import { ComprehensiveSearchResponse, SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('comprehensive')
  @ApiOperation({
    summary: 'Comprehensive public search',
    description:
      'Searches approved public non-expired trips and approved visible on-demand trips. Returns grouped results with counts.',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Free text query' })
  @ApiQuery({ name: 'tripLimit', required: false, description: 'Maximum trips to return' })
  @ApiQuery({ name: 'onDemandLimit', required: false, description: 'Maximum on-demand trips to return' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  async comprehensiveSearch(@Query() query: ComprehensiveSearchQueryDto): Promise<ComprehensiveSearchResponse> {
    return this.searchService.comprehensiveSearch(query);
  }
}
